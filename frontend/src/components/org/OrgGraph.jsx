import { useEffect, useState, useMemo } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { Box, Paper, Typography, Avatar, Chip, Tooltip, Skeleton, useTheme, TextField, InputAdornment } from '@mui/material';
import { Business, Group, Person, WorkOutline, Search } from '@mui/icons-material';
import teamService from '../../services/teamService';
import GlassCard from '../common/GlassCard';

const nodeWidth = 220;
const nodeHeight = 100;

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 100 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const isHorizontal = direction === 'LR';

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = isHorizontal ? Position.Left : Position.Top;
        node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };
        return node;
    });

    return { nodes, edges };
};

// Company/Workspace node
const CompanyNode = ({ data }) => {
    return (
        <GlassCard
            sx={{
                p: 2,
                width: nodeWidth,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderRadius: 4,
                border: '2px solid',
                borderColor: '#4f46e5',
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                boxShadow: '0 8px 32px rgba(79, 70, 229, 0.3)',
            }}
        >
            <Business sx={{ fontSize: 40, color: 'white' }} />
            <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'white' }}>
                    {data.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    {data.subtitle}
                </Typography>
            </Box>
        </GlassCard>
    );
};

// Team node
const TeamNode = ({ data }) => {
    const theme = useTheme();
    return (
        <Tooltip
            title={`${data.memberCount} members • ${data.projectCount} projects`}
            arrow
            placement="right"
        >
            <GlassCard
                sx={{
                    p: 2,
                    width: nodeWidth,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    borderRadius: 4,
                    border: '2px solid',
                    borderColor: data.color || '#6554C0',
                    background: theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.9) 100%)'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)',
                    boxShadow: `0 8px 32px ${data.color}30`,
                }}
            >
                <Avatar sx={{ bgcolor: data.color || '#6554C0', width: 44, height: 44 }}>
                    <Group />
                </Avatar>
                <Box sx={{ overflow: 'hidden' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {data.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {data.memberCount} members
                    </Typography>
                </Box>
            </GlassCard>
        </Tooltip>
    );
};

// Person node (lead or member)
const PersonNode = ({ data }) => {
    const theme = useTheme();
    return (
        <Tooltip
            title={
                <Box>
                    <Typography variant="body2">{data.email}</Typography>
                    <Typography variant="caption">Role: {data.role?.replace('_', ' ')}</Typography>
                    {data.taskCount !== undefined && (
                        <Typography variant="caption" display="block">
                            Active tasks: {data.taskCount}
                        </Typography>
                    )}
                </Box>
            }
            arrow
            placement="right"
        >
            <GlassCard
                sx={{
                    p: 1.5,
                    width: nodeWidth - 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: data.isLead
                        ? '#4f46e5'
                        : (theme.palette.mode === 'dark' ? 'rgba(148,163,184,0.4)' : 'rgba(148,163,184,0.35)'),
                    background: theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.85) 100%)'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.85) 100%)',
                    boxShadow: data.isLead ? '0 4px 20px rgba(79, 70, 229, 0.15)' : '0 2px 10px rgba(0,0,0,0.1)',
                }}
            >
                <Avatar
                    src={data.avatar}
                    sx={{
                        width: 40,
                        height: 40,
                        bgcolor: data.isLead ? '#4f46e5' : 'grey.500',
                        border: data.isLead ? '2px solid #4f46e5' : 'none',
                    }}
                >
                    {data.fullName?.[0] || <Person />}
                </Avatar>
                <Box sx={{ overflow: 'hidden', flex: 1 }}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: data.isLead ? 700 : 500,
                            color: 'text.primary',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}
                    >
                        {data.fullName}
                    </Typography>
                    <Chip
                        label={data.isLead ? 'Team Lead' : data.role?.replace('_', ' ')}
                        size="small"
                        sx={{
                            height: 18,
                            fontSize: '0.6rem',
                            fontWeight: 600,
                            background: data.isLead
                                ? 'linear-gradient(to right, #4f46e5, #818cf8)'
                                : (theme.palette.mode === 'dark' ? 'rgba(148,163,184,0.22)' : 'rgba(100,100,100,0.12)'),
                            color: data.isLead ? 'white' : 'text.secondary',
                            textTransform: 'uppercase',
                        }}
                    />
                </Box>
            </GlassCard>
        </Tooltip>
    );
};

const nodeTypes = {
    company: CompanyNode,
    team: TeamNode,
    person: PersonNode,
};

const OrgGraph = () => {
    const [nodes, setNodes] = useNodesState([]);
    const [edges, setEdges] = useEdgesState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const theme = useTheme();

    useEffect(() => {
        const fetchOrgData = async () => {
            setLoading(true);
            try {
                // Fetch teams with their members
                const teams = await teamService.getTeams();

                const newNodes = [];
                const newEdges = [];

                // Root company node
                const companyId = 'company-root';
                newNodes.push({
                    id: companyId,
                    type: 'company',
                    data: {
                        name: 'Digital Dockers',
                        subtitle: 'Organization'
                    },
                    position: { x: 0, y: 0 }
                });

                // Add team nodes and their members
                teams.forEach((team, teamIndex) => {
                    const teamId = `team-${team._id}`;

                    // Team node
                    newNodes.push({
                        id: teamId,
                        type: 'team',
                        data: {
                            name: team.name,
                            color: team.color || (teamIndex === 0 ? '#0052CC' : '#6554C0'),
                            memberCount: team.members?.length || 0,
                            projectCount: team.projects?.length || 0
                        },
                        position: { x: 0, y: 0 }
                    });

                    // Edge from company to team
                    newEdges.push({
                        id: `e-company-${teamId}`,
                        source: companyId,
                        target: teamId,
                        type: 'step',
                        style: { stroke: team.color || '#6554C0', strokeWidth: 2 },
                        animated: true
                    });

                    // Add team lead if exists
                    if (team.lead) {
                        const leadId = `lead-${team.lead._id}`;
                        newNodes.push({
                            id: leadId,
                            type: 'person',
                            data: {
                                fullName: team.lead.fullName,
                                email: team.lead.email,
                                role: team.lead.role || 'Lead',
                                avatar: team.lead.profileInfo?.avatar,
                                isLead: true
                            },
                            position: { x: 0, y: 0 }
                        });

                        newEdges.push({
                            id: `e-${teamId}-${leadId}`,
                            source: teamId,
                            target: leadId,
                            type: 'step',
                            style: { stroke: '#4f46e5', strokeWidth: 2 },
                            animated: true
                        });
                    }

                    // Add team members (excluding lead)
                    team.members?.forEach((member) => {
                        if (team.lead && member._id === team.lead._id) return; // Skip lead

                        const memberId = `member-${team._id}-${member._id}`;
                        newNodes.push({
                            id: memberId,
                            type: 'person',
                            data: {
                                fullName: member.fullName,
                                email: member.email,
                                role: member.role,
                                avatar: member.profileInfo?.avatar,
                                isLead: false
                            },
                            position: { x: 0, y: 0 }
                        });

                        // Connect member to team lead if exists, otherwise to team
                        const sourceNode = team.lead
                            ? `lead-${team.lead._id}`
                            : teamId;

                        newEdges.push({
                            id: `e-${sourceNode}-${memberId}`,
                            source: sourceNode,
                            target: memberId,
                            type: 'step',
                            style: { stroke: theme.palette.text.secondary, strokeWidth: 1.5 }
                        });
                    });
                });

                // Apply layout
                const layouted = getLayoutedElements(newNodes, newEdges);
                setNodes(layouted.nodes);
                setEdges(layouted.edges);

            } catch (err) {
                console.error("Failed to fetch org data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrgData();
    }, [setNodes, setEdges, theme]);

    const onNodesChange = () => { };
    const onEdgesChange = () => { };

    // Filter nodes based on search term by updating opacity
    const filteredNodes = useMemo(() => {
        if (!searchTerm) return nodes;

        const lowerTerm = searchTerm.toLowerCase();
        return nodes.map(node => {
            const isMatch = 
                (node.data.name && node.data.name.toLowerCase().includes(lowerTerm)) ||
                (node.data.fullName && node.data.fullName.toLowerCase().includes(lowerTerm)) ||
                (node.data.role && node.data.role.toLowerCase().includes(lowerTerm));
            
            return {
                ...node,
                style: {
                    ...node.style,
                    opacity: isMatch ? 1 : 0.2,
                    transition: 'opacity 0.3s ease'
                }
            };
        });
    }, [nodes, searchTerm]);

    if (loading) {
        return (
            <Box sx={{ height: 'calc(100vh - 100px)', width: '100%' }}>
                <Typography variant="h5" sx={{
                    mb: 2,
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #4f46e5, #818cf8)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Organization Structure
                </Typography>
                <Paper sx={{
                    height: '100%',
                    p: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper'
                }}>
                    <Box sx={{ textAlign: 'center' }}>
                        <Skeleton variant="circular" width={80} height={80} sx={{ mx: 'auto', mb: 2 }} />
                        <Skeleton variant="text" width={200} sx={{ mx: 'auto' }} />
                        <Skeleton variant="text" width={150} sx={{ mx: 'auto' }} />
                    </Box>
                </Paper>
            </Box>
        );
    }

    return (
        <Box sx={{ height: 'calc(100vh - 100px)', width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" sx={{
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #4f46e5, #818cf8)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Organization Structure
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                        size="small"
                        placeholder="Search people, roles, teams..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ width: 250 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Chip
                        icon={<WorkOutline />}
                        label="View Only"
                        size="small"
                        sx={{
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(148,163,184,0.18)' : 'rgba(100,100,100,0.1)',
                            color: 'text.secondary'
                        }}
                    />
                </Box>
            </Box>
            <Paper sx={{
                height: '100%',
                width: '100%',
                borderRadius: 3,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: theme.palette.mode === 'dark'
                    ? '0 8px 28px rgba(2, 6, 23, 0.55)'
                    : '0 4px 20px rgba(0,0,0,0.08)'
            }}>
                <ReactFlow
                    nodes={filteredNodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    fitView
                    attributionPosition="bottom-right"
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    zoomOnScroll={true}
                    panOnScroll={true}
                    preventScrolling={false}
                    proOptions={{ hideAttribution: true }}
                >
                    <Controls showInteractive={false} />
                    <MiniMap
                        style={{
                            borderRadius: 8,
                            background: theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc',
                            border: `1px solid ${theme.palette.divider}`
                        }}
                        maskColor={theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.55)' : 'rgba(248, 250, 252, 0.68)'}
                        nodeColor={(node) => {
                            if (node.type === 'company') return '#4f46e5';
                            if (node.type === 'team') return node.data?.color || '#6554C0';
                            return '#94a3b8';
                        }}
                    />
                    <Background variant="dots" gap={16} size={1} color={theme.palette.divider} />
                </ReactFlow>
            </Paper>
        </Box>
    );
};

export default OrgGraph;
