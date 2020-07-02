export interface manifest {
    id: string,
    name: string,
    fileName: string,
    mapping: DataPoint[],
    version: string,
    oAuthEnabled: boolean,
    cardId: string,
    appContextId: string,
    proxyId: string,
    scopes: any,
    fullpage: boolean,
    ignore: any,
    contextId: any,
    size: any
}

export interface DataPoint {
    dataSetId: string,
    alias: string,
    fields: Fields[]
}
interface Fields {
    alias: string,
    columnName: string
}