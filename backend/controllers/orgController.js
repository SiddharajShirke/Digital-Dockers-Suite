const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// @desc    Get Organization Tree
// @route   GET /api/users/org-tree
// @access  Private
const getOrgTree = asyncHandler(async (req, res) => {
    // Fetch all users with id, name, role, reportsTo, avatar
    const users = await User.find({ isActive: true })
        .select('_id fullName role reportsTo profileInfo.avatar')
        .lean();

    // Build Tree
    const userMap = {};
    users.forEach(u => {
        userMap[u._id] = { ...u, children: [] };
    });

    const root = [];
    users.forEach(u => {
        if (u.reportsTo && userMap[u.reportsTo]) {
            userMap[u.reportsTo].children.push(userMap[u._id]);
        } else {
            root.push(userMap[u._id]);
        }
    });

    // Provide stats or task counts if needed (mock for now or join with Tasks)
    // For now, return the tree structure suitable for React Flow (Nodes + Edges)

    // Transform to React Flow format (condensed list of nodes and edges)
    // const nodes = [];
    // const edges = [];

    // Layout logic should be frontend (dagre), but we send flat list + hierarchy

    res.status(200).json(users); // Frontend handles tree construction/layout
});

module.exports = {
    getOrgTree
};
