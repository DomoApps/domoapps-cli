export interface DomoOptions { 
    userId: number,
    external: boolean,
    manifest: string
  }

export interface AppData {
    authorities: string[],
    authorizedAppDomains: string[],
    authorizedDomains: string[],
    buzzAudienceDefaultsObjectChat: string,
    customer: string,
    customerTier: string,
    domoappsDomain: string,
    environment: string,
    features: Object[],
    isSaaSaas: boolean,
    locale: string,
    url: string,
    useDomoAnalytics: true,
    user: User,
}

interface User {
    detail: Detail,
    displayName: string,
    id: number,
    invitorUserId: number,
    role: string,
    roleId: number
}

interface Detail {
    active: boolean,
    created: number,
    email: string,
    modified: number,
    pending: boolean
}

export interface AppContext {
    accountMapping: unknown,
    collections: unknown[],
    designId: string,
    designVersion: unknown,
    id: string | number,
    isDisabled: boolean,
    mapping: unknown
}