import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import projectService from '../services/projectService';
import sprintService from '../services/sprintService';

const ProjectContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useProject = () => useContext(ProjectContext);

export const ProjectProvider = ({ children }) => {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [currentProject, setCurrentProject] = useState(null);
    const [sprints, setSprints] = useState([]);
    const [activeSprint, setActiveSprint] = useState(null);
    const [loading, setLoading] = useState(false);

    // Initial Load - only when user is authenticated
    useEffect(() => {
        if (user) {
            loadProjects();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Load Sprints when project changes
    useEffect(() => {
        if (currentProject) {
            loadSprints(currentProject._id);
        } else {
            setSprints([]);
            setActiveSprint(null);
        }
    }, [currentProject]);

    const loadProjects = async () => {
        setLoading(true);
        try {
            const data = await projectService.getAllProjects();
            setProjects(data);
            if (data.length > 0 && !currentProject) {
                // Default to first project or saved pref
                setCurrentProject(data[0]);
            }
            return data; // Return for callers that need the fresh list
        } catch (error) {
            console.error("Failed to load projects", error);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const loadSprints = async (projectId) => {
        try {
            const data = await sprintService.getSprintsByProject(projectId);
            setSprints(data);
            const active = data.find(s => s.status === 'active') || data.find(s => s.status === 'future');
            setActiveSprint(active || null); // Default to active or first future, or null
        } catch (error) {
            console.error("Failed to load sprints", error);
        }
    };

    const switchProject = async (projectId) => {
        // First try to find in current projects list
        let proj = projects.find(p => p._id === projectId);
        if (!proj) {
            // Project not in list yet (likely just created) — fetch directly from API
            try {
                const freshProject = await projectService.getProjectById(projectId);
                if (freshProject) {
                    proj = freshProject;
                    // Also add it to the projects list
                    setProjects(prev => [...prev, freshProject]);
                }
            } catch (err) {
                console.error("Failed to fetch project by ID:", err);
            }
        }
        if (proj) setCurrentProject(proj);
    };

    const refreshBoard = () => {
        if (currentProject) loadSprints(currentProject._id);
    };

    // Refresh projects list (after creating a new project)
    const refreshProjects = async () => {
        return await loadProjects();
    };

    return (
        <ProjectContext.Provider value={{
            projects,
            currentProject,
            sprints,
            activeSprint,
            isLoading: loading,
            switchProject,
            setActiveSprint, // Manual override for board view if needed
            refreshBoard,
            refreshProjects
        }}>
            {children}
        </ProjectContext.Provider>
    );
};
