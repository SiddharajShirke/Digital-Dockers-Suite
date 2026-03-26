const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mongoose = require('mongoose');
const EmployeeCV = require('../models/EmployeeCV');
const User = require('../models/User');
const nvidiaLLM = require('./nvidiaLLMService');

/**
 * ============================================================================
 * CV PARSER SERVICE
 * ============================================================================
 * Handles the pipeline: PDF file → raw text extraction → LLM skill extraction
 * → update EmployeeCV model → sync skills to User.profileInfo.skills
 */

class CVParserService {
    /**
     * Parse a PDF CV file and extract structured data
     * @param {string} cvRecordId - The EmployeeCV document ID
     * @returns {object} Updated EmployeeCV document
     */
    static async parseAndExtract(cvRecordId) {
        const cvRecord = await EmployeeCV.findById(cvRecordId);
        if (!cvRecord) {
            throw new Error('CV record not found');
        }

        try {
            // Step 1: Update status to 'parsing'
            cvRecord.status = 'parsing';
            await cvRecord.save();

            console.log(`📄 Parsing CV for user: ${cvRecord.user} | File: ${cvRecord.originalFilename}`);

            // Step 2: Extract text from PDF
            let rawText = '';

            if (cvRecord.filePath && fs.existsSync(cvRecord.filePath)) {
                // Parse from local file
                const dataBuffer = fs.readFileSync(cvRecord.filePath);
                const pdfData = await pdfParse(dataBuffer);
                rawText = pdfData.text;
            } else if (cvRecord.gridFSFileId) {
                // Parse from GridFS
                rawText = await this._readFromGridFS(cvRecord.gridFSFileId);
            } else {
                throw new Error('No file source available (neither filePath nor gridFSFileId)');
            }

            if (!rawText || rawText.trim().length < 50) {
                throw new Error('Extracted text is too short or empty. The PDF may be image-based or corrupted.');
            }

            console.log(`📝 Extracted ${rawText.length} characters from PDF`);

            // Step 3: Store raw text
            cvRecord.parsedText = rawText;

            // Step 4: Use NVIDIA LLM to extract structured data
            console.log('🤖 Sending to NVIDIA LLM for skill extraction...');
            const extractedData = await nvidiaLLM.extractSkillsFromCV(rawText);

            cvRecord.extractedData = extractedData;
            cvRecord.status = 'parsed';
            cvRecord.parsedAt = new Date();
            cvRecord.errorMessage = undefined;
            await cvRecord.save();

            console.log(`✅ CV parsed successfully! Found ${extractedData.skills.length} skills, ${extractedData.experience.length} experience entries`);

            // Step 5: Sync extracted skills to User profile
            await this._syncSkillsToUser(cvRecord.user, extractedData.skills);

            return cvRecord;
        } catch (error) {
            console.error(`❌ CV parsing failed for ${cvRecordId}:`, error.message);

            cvRecord.status = 'error';
            cvRecord.errorMessage = error.message;
            await cvRecord.save();

            throw error;
        }
    }

    /**
     * Read a PDF file from GridFS and extract text
     * @param {ObjectId} fileId - GridFS file ID
     * @returns {string} Extracted text
     */
    static async _readFromGridFS(fileId) {
        try {
            const db = mongoose.connection.db;
            const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'cvUploads' });

            return new Promise((resolve, reject) => {
                const chunks = [];
                const downloadStream = bucket.openDownloadStream(fileId);

                downloadStream.on('data', (chunk) => chunks.push(chunk));
                downloadStream.on('end', async () => {
                    try {
                        const buffer = Buffer.concat(chunks);
                        const pdfData = await pdfParse(buffer);
                        resolve(pdfData.text);
                    } catch (err) {
                        reject(err);
                    }
                });
                downloadStream.on('error', reject);
            });
        } catch (error) {
            throw new Error(`GridFS read failed: ${error.message}`);
        }
    }

    /**
     * Sync extracted skills to User.profileInfo.skills
     * Merges with existing skills (no duplicates)
     * @param {ObjectId} userId
     * @param {string[]} newSkills
     */
    static async _syncSkillsToUser(userId, newSkills) {
        try {
            const user = await User.findById(userId);
            if (!user) return;

            const existingSkills = user.profileInfo?.skills || [];
            const normalizedExisting = existingSkills.map(s => s.toLowerCase().trim());
            
            // Merge: add new skills that don't already exist
            const mergedSkills = [...existingSkills];
            for (const skill of newSkills) {
                const normalized = skill.toLowerCase().trim();
                if (!normalizedExisting.includes(normalized)) {
                    mergedSkills.push(skill);
                    normalizedExisting.push(normalized);
                }
            }

            if (!user.profileInfo) {
                user.profileInfo = {};
            }
            user.profileInfo.skills = mergedSkills;
            await user.save();

            console.log(`🔄 Synced ${mergedSkills.length} skills to User (${user.fullName}): +${mergedSkills.length - existingSkills.length} new`);
        } catch (error) {
            console.error('⚠️ Failed to sync skills to user:', error.message);
            // Non-fatal: CV parsing still succeeds even if sync fails
        }
    }

    /**
     * Get all parsed CVs for a list of user IDs
     * @param {ObjectId[]} userIds
     * @returns {EmployeeCV[]} Array of parsed CV documents
     */
    static async getParsedCVsForUsers(userIds) {
        return EmployeeCV.find({
            user: { $in: userIds },
            status: 'parsed'
        }).populate('user', 'fullName email profileInfo role');
    }
}

module.exports = CVParserService;
