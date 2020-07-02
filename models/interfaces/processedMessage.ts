import { IncomingMessage } from "http";

export interface ProcessedMessage extends IncomingMessage {
    body: object
    action: string
    message: string
    latest: string
}