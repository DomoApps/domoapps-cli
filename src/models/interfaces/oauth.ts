export interface FullRegistration {
  verification_uri: string;
  user_code: string;
  device_code: string;
  instance: string;
  manifestName: string;
  proxyId: string;
}

export interface Registration {
  instance: string;
  manifestName: string;
  proxyId: string;
}

export interface ActiveRegistration extends Registration {
  accessToken: string;
  refreshToken: string;
}
