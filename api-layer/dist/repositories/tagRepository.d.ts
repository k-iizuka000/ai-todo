export interface CreateTagInput {
    name: string;
    color?: string;
}
export interface UpdateTagInput {
    name?: string;
    color?: string;
}
export declare const tagRepository: {
    findAll(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        color: string;
        usageCount: number;
    }[]>;
    findById(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        color: string;
        usageCount: number;
    } | null>;
    findByName(name: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        color: string;
        usageCount: number;
    } | null>;
    create(data: CreateTagInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        color: string;
        usageCount: number;
    }>;
    update(id: string, data: UpdateTagInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        color: string;
        usageCount: number;
    }>;
    delete(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        color: string;
        usageCount: number;
    }>;
    findOrCreateMany(names: string[]): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        color: string;
        usageCount: number;
    }[]>;
    getPopular(limit?: number): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        color: string;
        usageCount: number;
    }[]>;
};
