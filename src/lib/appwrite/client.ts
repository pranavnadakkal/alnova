import { Client, Account, Permission, Role, Storage, TablesDB } from 'appwrite';
import { getRowPermissions, resolveTableId, type AppwriteRowData } from './tables';

export const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const account = new Account(client);
const appwriteTables = new TablesDB(client);
const permissions = {
  read: (role: string) => Permission.read(role),
  write: (role: string) => Permission.write(role),
  update: (role: string) => Permission.update(role),
  delete: (role: string) => Permission.delete(role),
  user: (userId: string) => Role.user(userId),
  users: Role.users(),
}

export const tablesDB = {
  async listRows(databaseId: string, tableName: string, queries?: string[]) {
    return appwriteTables.listRows({
      databaseId,
      tableId: resolveTableId(tableName),
      queries,
    });
  },
  createRow(
    databaseId: string,
    tableName: string,
    rowId: string,
    data: AppwriteRowData,
  ) {
    return appwriteTables.createRow({
      databaseId,
      tableId: resolveTableId(tableName),
      rowId,
      data,
      permissions: getRowPermissions(tableName, data, permissions),
    });
  },
  updateRow(
    databaseId: string,
    tableName: string,
    rowId: string,
    data: AppwriteRowData,
  ) {
    return appwriteTables.updateRow({
      databaseId,
      tableId: resolveTableId(tableName),
      rowId,
      data,
    });
  },
  deleteRow(databaseId: string, tableName: string, rowId: string) {
    return appwriteTables.deleteRow({
      databaseId,
      tableId: resolveTableId(tableName),
      rowId,
    });
  },
};
export const storage = new Storage(client);