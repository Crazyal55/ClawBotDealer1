import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export class BaseRepository {
  protected pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  protected async query<T extends QueryResultRow>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries (>100ms)
      if (duration > 100) {
        console.warn(`[Repo] Slow query (${duration}ms):`, { query: text, params });
      }
      
      return result;
    } catch (error) {
      console.error('[Repo] Query error:', error);
      throw error;
    }
  }

  protected async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  protected mapEntity(row: any): any {
    if (!row) return null;
    return row;
  }
}
