import { PrismaClient } from '@prisma/client';
import { PaginationParams, PaginationMeta, SortOptions } from '@/types/api.js';

export abstract class BaseRepository<T, CreateDto, UpdateDto> {
  constructor(protected prisma: PrismaClient) {}

  abstract findAll(params?: any): Promise<T[]>;
  abstract findById(id: string): Promise<T | null>;
  abstract create(data: CreateDto, userId: string): Promise<T>;
  abstract update(id: string, data: UpdateDto, userId: string): Promise<T>;
  abstract delete(id: string, userId: string): Promise<void>;

  /**
   * Generate pagination meta information
   */
  protected generatePaginationMeta(
    page: number,
    limit: number,
    total: number
  ): PaginationMeta {
    const totalPages = Math.ceil(total / limit);
    return {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Generate pagination parameters
   */
  protected getPaginationParams(params?: PaginationParams) {
    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(100, Math.max(1, params?.limit || 10));
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  /**
   * Generate Prisma orderBy clause from sort options
   */
  protected generateOrderBy(sort?: SortOptions) {
    if (!sort) {
      return { createdAt: 'desc' as const };
    }

    return {
      [sort.field]: sort.order,
    };
  }

  /**
   * Build where clause with common filters
   */
  protected buildBaseWhereClause(search?: string, additionalWhere?: any) {
    const where: any = { ...additionalWhere };

    if (search) {
      // Override in specific repositories for specific search logic
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  /**
   * Execute transaction
   */
  protected async executeTransaction<R>(
    transaction: (tx: PrismaClient) => Promise<R>
  ): Promise<R> {
    return this.prisma.$transaction(transaction);
  }

  /**
   * Check if entity exists
   */
  protected async exists(id: string, model: string): Promise<boolean> {
    const count = await (this.prisma as any)[model].count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Validate entity ownership or access
   */
  protected async validateAccess(
    id: string, 
    userId: string, 
    model: string,
    accessField: string = 'createdBy'
  ): Promise<boolean> {
    const entity = await (this.prisma as any)[model].findUnique({
      where: { id },
      select: { [accessField]: true },
    });

    return entity && entity[accessField] === userId;
  }
}