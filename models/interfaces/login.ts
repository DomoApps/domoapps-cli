export interface login {
    instance: string,
    refreshToken: string,
    devToken: boolean|undefined
}
export interface domo {
    instance: string,
    server: string,
    refreshToken: string,
    clientId: string,
    devToken: boolean
}