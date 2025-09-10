export interface CreateProjectInput {
    name: string;
    description?: string;
    color?: string;
}
export interface UpdateProjectInput {
    name?: string;
    description?: string;
    color?: string;
}
export declare const projectRepository: {
    findAll(): Promise<({
        _count: {
            tasks: number;
        };
    } & {
        id: string;
        description: string | null;
        status: import(".prisma/client").$Enums.ProjectStatus;
        priority: import(".prisma/client").$Enums.ProjectPriority;
        createdAt: Date;
        updatedAt: Date;
        createdBy: string;
        updatedBy: string;
        name: string;
        color: string;
        icon: string | null;
        ownerId: string;
        startDate: Date | null;
        endDate: Date | null;
        deadline: Date | null;
        budget: number | null;
        isArchived: boolean;
    })[]>;
    findById(id: string): Promise<({
        _count: {
            tasks: number;
        };
        tasks: ({
            assignee: {
                id: string;
                status: import(".prisma/client").$Enums.UserStatus;
                createdAt: Date;
                updatedAt: Date;
                email: string;
                role: import(".prisma/client").$Enums.UserRole;
                authProvider: import(".prisma/client").$Enums.AuthProvider;
                emailVerified: boolean;
                lastLoginAt: Date | null;
            } | null;
            tags: {
                id: string;
                taskId: string;
                tagId: string;
            }[];
        } & {
            id: string;
            title: string;
            description: string | null;
            status: import(".prisma/client").$Enums.TaskStatus;
            priority: import(".prisma/client").$Enums.Priority;
            projectId: string | null;
            assigneeId: string | null;
            parentId: string | null;
            dueDate: Date | null;
            estimatedHours: number | null;
            actualHours: number | null;
            archivedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            createdBy: string;
            updatedBy: string;
        })[];
    } & {
        id: string;
        description: string | null;
        status: import(".prisma/client").$Enums.ProjectStatus;
        priority: import(".prisma/client").$Enums.ProjectPriority;
        createdAt: Date;
        updatedAt: Date;
        createdBy: string;
        updatedBy: string;
        name: string;
        color: string;
        icon: string | null;
        ownerId: string;
        startDate: Date | null;
        endDate: Date | null;
        deadline: Date | null;
        budget: number | null;
        isArchived: boolean;
    }) | null>;
    create(data: CreateProjectInput): Promise<{
        id: string;
        description: string | null;
        status: import(".prisma/client").$Enums.ProjectStatus;
        priority: import(".prisma/client").$Enums.ProjectPriority;
        createdAt: Date;
        updatedAt: Date;
        createdBy: string;
        updatedBy: string;
        name: string;
        color: string;
        icon: string | null;
        ownerId: string;
        startDate: Date | null;
        endDate: Date | null;
        deadline: Date | null;
        budget: number | null;
        isArchived: boolean;
    }>;
    update(id: string, data: UpdateProjectInput): Promise<{
        _count: {
            tasks: number;
        };
    } & {
        id: string;
        description: string | null;
        status: import(".prisma/client").$Enums.ProjectStatus;
        priority: import(".prisma/client").$Enums.ProjectPriority;
        createdAt: Date;
        updatedAt: Date;
        createdBy: string;
        updatedBy: string;
        name: string;
        color: string;
        icon: string | null;
        ownerId: string;
        startDate: Date | null;
        endDate: Date | null;
        deadline: Date | null;
        budget: number | null;
        isArchived: boolean;
    }>;
    delete(id: string): Promise<{
        id: string;
        description: string | null;
        status: import(".prisma/client").$Enums.ProjectStatus;
        priority: import(".prisma/client").$Enums.ProjectPriority;
        createdAt: Date;
        updatedAt: Date;
        createdBy: string;
        updatedBy: string;
        name: string;
        color: string;
        icon: string | null;
        ownerId: string;
        startDate: Date | null;
        endDate: Date | null;
        deadline: Date | null;
        budget: number | null;
        isArchived: boolean;
    }>;
    getStats(id: string): Promise<{
        project: {
            tasks: {
                id: string;
                title: string;
                description: string | null;
                status: import(".prisma/client").$Enums.TaskStatus;
                priority: import(".prisma/client").$Enums.Priority;
                projectId: string | null;
                assigneeId: string | null;
                parentId: string | null;
                dueDate: Date | null;
                estimatedHours: number | null;
                actualHours: number | null;
                archivedAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
                createdBy: string;
                updatedBy: string;
            }[];
        } & {
            id: string;
            description: string | null;
            status: import(".prisma/client").$Enums.ProjectStatus;
            priority: import(".prisma/client").$Enums.ProjectPriority;
            createdAt: Date;
            updatedAt: Date;
            createdBy: string;
            updatedBy: string;
            name: string;
            color: string;
            icon: string | null;
            ownerId: string;
            startDate: Date | null;
            endDate: Date | null;
            deadline: Date | null;
            budget: number | null;
            isArchived: boolean;
        };
        stats: {
            total: number;
            todo: number;
            inProgress: number;
            done: number;
            archived: number;
        };
    } | null>;
};
