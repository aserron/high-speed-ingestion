/**
 * PostgreSQL Storage Adapter
 *
 * Implements the RelationalStorageInterface using PostgreSQL as the backend
 * for structured data storage and complex queries.
 */

// Internal modules
import { validators } from '../../utils/common-utilities.js'
import { getLogger } from '../../logging/index.js'

// Relative modules
import { RelationalStorageInterface } from '../interfaces.js'
import { PostgreSQLConnectionManager } from '../postgresql.js'

/**
 * PostgreSQL storage adapter implementing RelationalStorageInterface
 */
export class PostgreSQLStorageAdapter extends RelationalStorageInterface {
  constructor (config = null) {
    super()
    this.connectionManager = new PostgreSQLConnectionManager(config)
    this.logger = getLogger('postgresql-adapter')
  }

  /**
   * Initialize PostgreSQL storage
   */
  async initialize () {
    await this.connectionManager.initialize()
    this.logger.info('PostgreSQL storage adapter initialized')
  }

  /**
   * Perform health check
   */
  async healthCheck () {
    return await this.connectionManager.healthCheck()
  }

  /**
   * Get storage statistics
   */
  getStats () {
    return {
      type: 'postgresql',
      ...this.connectionManager.getStats()
    }
  }

  /**
   * Execute a query
   */
  async query (sql, params = []) {
    validators.key(sql, 'sql')

    return await this.connectionManager.query(sql, params)
  }

  /**
   * Execute a transaction
   */
  async transaction (callback) {
    validators.function(callback, 'callback')

    return await this.connectionManager.transaction(callback)
  }

  /**
   * Insert a single record
   */
  async insert (table, data, options = {}) {
    validators.key(table, 'table')
    validators.object(data, 'data')

    const returning = options.returning || null
    return await this.connectionManager.insert(table, data, returning)
  }

  /**
   * Insert multiple records
   */
  async insertBatch (table, records, options = {}) {
    validators.key(table, 'table')
    validators.array(records, 'records', 1)

    const returning = options.returning || null
    return await this.connectionManager.insertBatch(table, records, returning)
  }

  /**
   * Update records
   */
  async update (table, data, whereClause, whereParams = []) {
    validators.key(table, 'table')
    validators.object(data, 'data')
    validators.key(whereClause, 'whereClause')

    return await this.connectionManager.update(table, data, whereClause, whereParams)
  }

  /**
   * Delete records
   */
  async delete (table, whereClause, whereParams = []) {
    validators.key(table, 'table')
    validators.key(whereClause, 'whereClause')

    return await this.connectionManager.delete(table, whereClause, whereParams)
  }

  /**
   * Select records
   */
  async select (table, options = {}) {
    validators.key(table, 'table')

    const {
      columns = '*',
      where = null,
      whereParams = [],
      orderBy = null,
      limit = null,
      offset = null
    } = options

    let query = `SELECT ${columns} FROM ${table}`
    const params = []

    if (where) {
      query += ` WHERE ${where}`
      params.push(...whereParams)
    }

    if (orderBy) {
      query += ` ORDER BY ${orderBy}`
    }

    if (limit) {
      query += ` LIMIT $${params.length + 1}`
      params.push(limit)
    }

    if (offset) {
      query += ` OFFSET $${params.length + 1}`
      params.push(offset)
    }

    return await this.connectionManager.query(query, params)
  }

  /**
   * Create table with schema
   */
  async createTable (tableName, schema, options = {}) {
    validators.key(tableName, 'tableName')
    validators.object(schema, 'schema')

    const columns = []
    const constraints = []

    for (const [columnName, columnDef] of Object.entries(schema)) {
      let columnSql = `${columnName} ${columnDef.type}`

      if (columnDef.primaryKey) {
        columnSql += ' PRIMARY KEY'
      }
      if (columnDef.notNull) {
        columnSql += ' NOT NULL'
      }
      if (columnDef.unique) {
        columnSql += ' UNIQUE'
      }
      if (columnDef.default !== undefined) {
        columnSql += ` DEFAULT ${columnDef.default}`
      }

      columns.push(columnSql)

      if (columnDef.foreignKey) {
        constraints.push(`FOREIGN KEY (${columnName}) REFERENCES ${columnDef.foreignKey}`)
      }
    }

    let createSql = `CREATE TABLE ${options.ifNotExists ? 'IF NOT EXISTS ' : ''}${tableName} (`
    createSql += columns.join(', ')

    if (constraints.length > 0) {
      createSql += `, ${constraints.join(', ')}`
    }

    createSql += ')'

    if (options.temporary) {
      createSql = createSql.replace('CREATE TABLE', 'CREATE TEMPORARY TABLE')
    }

    return await this.connectionManager.query(createSql)
  }

  /**
   * Drop table
   */
  async dropTable (tableName, options = {}) {
    validators.key(tableName, 'tableName')

    let dropSql = `DROP TABLE ${options.ifExists ? 'IF EXISTS ' : ''}${tableName}`

    if (options.cascade) {
      dropSql += ' CASCADE'
    }

    return await this.connectionManager.query(dropSql)
  }

  /**
   * Create index
   */
  async createIndex (indexName, tableName, columns, options = {}) {
    validators.key(indexName, 'indexName')
    validators.key(tableName, 'tableName')
    validators.array(columns, 'columns', 1)

    let createSql = `CREATE ${options.unique ? 'UNIQUE ' : ''}INDEX ${options.ifNotExists ? 'IF NOT EXISTS ' : ''}${indexName}`
    createSql += ` ON ${tableName} (${columns.join(', ')})`

    if (options.where) {
      createSql += ` WHERE ${options.where}`
    }

    return await this.connectionManager.query(createSql)
  }

  /**
   * Drop index
   */
  async dropIndex (indexName, options = {}) {
    validators.key(indexName, 'indexName')

    let dropSql = `DROP INDEX ${options.ifExists ? 'IF EXISTS ' : ''}${indexName}`

    if (options.cascade) {
      dropSql += ' CASCADE'
    }

    return await this.connectionManager.query(dropSql)
  }

  /**
   * Execute raw SQL file
   */
  async executeFile (sqlContent) {
    validators.key(sqlContent, 'sqlContent')

    return await this.connectionManager.executeFile(sqlContent)
  }

  /**
   * Get table information
   */
  async getTableInfo (tableName) {
    validators.key(tableName, 'tableName')

    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `

    return await this.connectionManager.query(query, [tableName])
  }

  /**
   * Get table indexes
   */
  async getTableIndexes (tableName) {
    validators.key(tableName, 'tableName')

    const query = `
      SELECT 
        i.relname as index_name,
        a.attname as column_name,
        ix.indisunique as is_unique,
        ix.indisprimary as is_primary
      FROM 
        pg_class t,
        pg_class i,
        pg_index ix,
        pg_attribute a
      WHERE 
        t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND a.attrelid = t.oid
        AND a.attnum = ANY(ix.indkey)
        AND t.relkind = 'r'
        AND t.relname = $1
      ORDER BY i.relname, a.attname
    `

    return await this.connectionManager.query(query, [tableName])
  }

  /**
   * Analyze table statistics
   */
  async analyzeTable (tableName) {
    validators.key(tableName, 'tableName')

    return await this.connectionManager.query(`ANALYZE ${tableName}`)
  }

  /**
   * Vacuum table
   */
  async vacuumTable (tableName, options = {}) {
    validators.key(tableName, 'tableName')

    let vacuumSql = 'VACUUM'

    if (options.full) {
      vacuumSql += ' FULL'
    }
    if (options.analyze) {
      vacuumSql += ' ANALYZE'
    }
    if (options.verbose) {
      vacuumSql += ' VERBOSE'
    }

    vacuumSql += ` ${tableName}`

    return await this.connectionManager.query(vacuumSql)
  }

  /**
   * Close PostgreSQL connection
   */
  async close () {
    await this.connectionManager.close()
    this.logger.info('PostgreSQL storage adapter closed')
  }
}

export default PostgreSQLStorageAdapter
