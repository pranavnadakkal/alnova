import { Client, Account, Permission, Role, TablesDB, Users } from 'node-appwrite';
import { cookies } from 'next/headers';
import { getRowPermissions, resolveTableId, type AppwriteRowData } from './tables';

export async function createSessionClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

  const cookieStore = await cookies();
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
  const session = cookieStore.get('appwrite-session')
    ?? cookieStore.get(`a_session_${projectId}`);

  if (!session || !session.value) {
    throw new Error('No active session');
  }

  client.setSession(session.value);
  const appwriteTables = new TablesDB(client);
  const permissions = {
    read: (role: string) => Permission.read(role),
    write: (role: string) => Permission.write(role),
    update: (role: string) => Permission.update(role),
    delete: (role: string) => Permission.delete(role),
    user: (userId: string) => Role.user(userId),
    users: Role.users(),
  };

  return {
    get account() { return new Account(client); },
    tablesDB: {
      async listRows(databaseId: string, tableName: string, queries?: string[]) {
        return appwriteTables.listRows({
          databaseId,
          tableId: resolveTableId(tableName),
          queries,
        });
      },
      createRow(databaseId: string, tableName: string, rowId: string, data: AppwriteRowData) {
        return appwriteTables.createRow({
          databaseId,
          tableId: resolveTableId(tableName),
          rowId,
          data,
          permissions: getRowPermissions(tableName, data, permissions),
        });
      },
      updateRow(databaseId: string, tableName: string, rowId: string, data: AppwriteRowData) {
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
    },
  };
}

export function createAdminClient() {
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!apiKey) throw new Error('APPWRITE_API_KEY is required for server-side Appwrite operations.');

  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(apiKey);
  const appwriteTables = new TablesDB(client);
  const permissions = {
    read: (role: string) => Permission.read(role),
    write: (role: string) => Permission.write(role),
    update: (role: string) => Permission.update(role),
    delete: (role: string) => Permission.delete(role),
    user: (userId: string) => Role.user(userId),
    users: Role.users(),
  };

  return {
    users: new Users(client),
    tablesDB: {
      async listRows(databaseId: string, tableName: string, queries?: string[]) {
        return appwriteTables.listRows({
          databaseId,
          tableId: resolveTableId(tableName),
          queries,
        });
      },
      createRow(databaseId: string, tableName: string, rowId: string, data: AppwriteRowData) {
        return appwriteTables.createRow({
          databaseId,
          tableId: resolveTableId(tableName),
          rowId,
          data,
          permissions: getRowPermissions(tableName, data, permissions),
        });
      },
      updateRow(databaseId: string, tableName: string, rowId: string, data: AppwriteRowData) {
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
    },
  };
}