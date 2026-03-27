const PdfPrinter = require('pdfmake');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell } = require('docx');

// Setup pdfmake fonts (using standard built-in fonts for simplicity to avoid asset paths)
const fonts = {
    Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
};

class ReportExportService {
    async exportToPDF(reportData) {
        return new Promise((resolve, reject) => {
            try {
                const printer = new PdfPrinter(fonts);
                const isProject = reportData.reportType === 'PROJECT';
                const ai = reportData.aiInsights;

                const docDefinition = {
                    content: [
                        { text: `${isProject ? 'Project' : 'Sprint'} Technical Report`, style: 'header' },
                        { text: `Target: ${isProject ? reportData.project.name : reportData.sprint.name}`, style: 'subheader' },
                        { text: `Generated on: ${new Date().toLocaleDateString()}`, margin: [0, 0, 0, 20] },
                        
                        { text: 'Executive Summary', style: 'sectionHeader' },
                        { text: ai.executiveSummary || 'No summary available.', margin: [0, 0, 0, 15] },

                        { text: 'Metrics Overview', style: 'sectionHeader' },
                        {
                            table: {
                                widths: ['*', '*'],
                                body: [
                                    ['Total Tasks', reportData.metrics.totalTasks.toString()],
                                    ['Status Distribution', `To Do: ${reportData.metrics.statusDistribution.todo}, In Progress: ${reportData.metrics.statusDistribution.in_progress}, Done: ${reportData.metrics.statusDistribution.done}`]
                                ]
                            },
                            margin: [0, 0, 0, 15]
                        },

                        { text: 'Task Breakdown', style: 'sectionHeader' },
                        { text: ai.taskBreakdowns || 'No breakdown available.', margin: [0, 0, 0, 15] },

                        ...(ai.velocityAnalysis ? [
                            { text: 'Velocity Analysis', style: 'sectionHeader' },
                            { text: ai.velocityAnalysis, margin: [0, 0, 0, 15] }
                        ] : []),

                        ...(ai.burndownAnalysis ? [
                            { text: 'Burndown Analysis', style: 'sectionHeader' },
                            { text: ai.burndownAnalysis, margin: [0, 0, 0, 15] }
                        ] : []),

                        { text: 'Future Predictions', style: 'sectionHeader' },
                        { text: ai.futurePredictions || 'No predictions available.', margin: [0, 0, 0, 15] },

                        { text: 'Risk Matrix', style: 'sectionHeader' },
                        this._buildRiskMatrixPDF(ai.riskMatrix),

                        { text: 'Verdict', style: 'sectionHeader', margin: [0, 20, 0, 5] },
                        { text: ai.verdict || 'No verdict available.', bold: true, margin: [0, 0, 0, 5] },
                        { text: `Confidence Score: ${ai.confidenceScoring?.score || 'N/A'}/100`, italics: true, color: 'blue' },
                        { text: `Reason: ${ai.confidenceScoring?.reason || 'N/A'}` }
                    ],
                    styles: {
                        header: { fontSize: 22, bold: true, margin: [0, 0, 0, 5] },
                        subheader: { fontSize: 16, bold: true, margin: [0, 0, 0, 5] },
                        sectionHeader: { fontSize: 14, bold: true, margin: [0, 15, 0, 5], color: '#2c3e50' }
                    },
                    defaultStyle: { font: 'Helvetica' }
                };

                const pdfDoc = printer.createPdfKitDocument(docDefinition);
                const chunks = [];
                pdfDoc.on('data', chunk => chunks.push(chunk));
                pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
                pdfDoc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    _buildRiskMatrixPDF(riskMatrix) {
        if (!riskMatrix || !Array.isArray(riskMatrix) || riskMatrix.length === 0) {
            return { text: 'No risks identified.', margin: [0, 0, 0, 15] };
        }

        return {
            table: {
                headerRows: 1,
                widths: ['auto', '*', '*'],
                body: [
                    [{ text: 'Severity', bold: true }, { text: 'Risk Item', bold: true }, { text: 'Mitigation', bold: true }],
                    ...riskMatrix.map(r => [
                        r.severity || 'Unknown',
                        r.riskItem || 'Unknown',
                        r.mitigation || 'Unknown'
                    ])
                ]
            },
            margin: [0, 0, 0, 15]
        };
    }

    /**
     * Generate HTML from report data
     * @param {object} reportData 
     * @returns {string} Highly formatted HTML string
     */
    exportToHTML(reportData) {
        const isProject = reportData.reportType === 'PROJECT';
        const ai = reportData.aiInsights;

        let riskRows = '';
        if (ai.riskMatrix && Array.isArray(ai.riskMatrix)) {
            riskRows = ai.riskMatrix.map(r => `
                <tr>
                    <td style="border:1px solid #ddd; padding:8px;">${r.severity}</td>
                    <td style="border:1px solid #ddd; padding:8px;">${r.riskItem}</td>
                    <td style="border:1px solid #ddd; padding:8px;">${r.mitigation}</td>
                </tr>
            `).join('');
        } else {
            riskRows = '<tr><td colspan="3" style="text-align:center; padding:8px;">No risks identified.</td></tr>';
        }

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>${isProject ? 'Project' : 'Sprint'} Technical Report</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
                    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                    h2 { color: #2980b9; margin-top: 30px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    th { background-color: #f4f4f4; border: 1px solid #ddd; padding: 10px; text-align: left; }
                    td { border: 1px solid #ddd; padding: 8px; }
                    .verdict-box { background-color: #f9f9f9; border-left: 4px solid #27ae60; padding: 15px; margin-top: 30px; }
                </style>
            </head>
            <body>
                <h1>${isProject ? 'Project' : 'Sprint'} Technical Report</h1>
                <p><strong>Target:</strong> ${isProject ? reportData.project.name : reportData.sprint.name}</p>
                <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
                
                <h2>Executive Summary</h2>
                <p>${ai.executiveSummary || 'No summary available.'}</p>

                <h2>Task Breakdown</h2>
                <p>${ai.taskBreakdowns || 'No breakdown available.'}</p>

                ${ai.velocityAnalysis ? `<h2>Velocity Analysis</h2><p>${ai.velocityAnalysis}</p>` : ''}
                ${ai.burndownAnalysis ? `<h2>Burndown Analysis</h2><p>${ai.burndownAnalysis}</p>` : ''}

                <h2>Future Predictions</h2>
                <p>${ai.futurePredictions || 'No predictions available.'}</p>

                <h2>Risk Matrix</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Severity</th>
                            <th>Risk Item</th>
                            <th>Mitigation</th>
                        </tr>
                    </thead>
                    <tbody>${riskRows}</tbody>
                </table>

                <div class="verdict-box">
                    <h2>Final Verdict</h2>
                    <p><strong>${ai.verdict || 'No verdict available.'}</strong></p>
                    <p><strong>Confidence Score:</strong> ${ai.confidenceScoring?.score || 'N/A'}/100</p>
                    <p><em>Reason:</em> ${ai.confidenceScoring?.reason || 'N/A'}</p>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Generate DOCX from report data
     * @param {object} reportData 
     * @returns {Promise<Buffer>}
     */
    async exportToDOCX(reportData) {
        const isProject = reportData.reportType === 'PROJECT';
        const ai = reportData.aiInsights;

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        text: `${isProject ? 'Project' : 'Sprint'} Technical Report`,
                        heading: HeadingLevel.HEADING_1
                    }),
                    new Paragraph({
                        text: `Target: ${isProject ? reportData.project.name : reportData.sprint.name}`
                    }),
                    new Paragraph({
                        text: `Generated on: ${new Date().toLocaleDateString()}`,
                        spacing: { after: 400 }
                    }),
                    
                    new Paragraph({ text: 'Executive Summary', heading: HeadingLevel.HEADING_2 }),
                    new Paragraph({ text: ai.executiveSummary || 'No summary available.' }),
                    
                    new Paragraph({ text: 'Task Breakdown', heading: HeadingLevel.HEADING_2 }),
                    new Paragraph({ text: ai.taskBreakdowns || 'No breakdown available.' }),

                    ...(ai.velocityAnalysis ? [
                        new Paragraph({ text: 'Velocity Analysis', heading: HeadingLevel.HEADING_2 }),
                        new Paragraph({ text: ai.velocityAnalysis })
                    ] : []),

                    ...(ai.burndownAnalysis ? [
                        new Paragraph({ text: 'Burndown Analysis', heading: HeadingLevel.HEADING_2 }),
                        new Paragraph({ text: ai.burndownAnalysis })
                    ] : []),

                    new Paragraph({ text: 'Future Predictions', heading: HeadingLevel.HEADING_2 }),
                    new Paragraph({ text: ai.futurePredictions || 'No predictions available.' }),

                    new Paragraph({ text: 'Verdict', heading: HeadingLevel.HEADING_2 }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: ai.verdict || 'No verdict available.', bold: true }),
                            new TextRun({ text: `\nConfidence Score: ${ai.confidenceScoring?.score || 'N/A'}/100`, italics: true })
                        ]
                    })
                ]
            }]
        });

        return await Packer.toBuffer(doc);
    }
}

module.exports = new ReportExportService();
