import { HttpErrorResponse } from '@angular/common/http';

export type ApiErrorKind =
  | 'timeout'
  | 'network'
  | 'not-found'
  | 'bad-request'
  | 'server'
  | 'payload-invalid'
  | 'unknown';

export interface ApiErrorInfo {
  kind: ApiErrorKind;
  status: number | null;
}

const INVALID_SINGLE_PAYLOAD_ERROR = 'Invalid product payload';
const INVALID_LIST_PAYLOAD_ERROR = 'Invalid products payload';
const API_TIMEOUT_ERROR = 'Api request timeout';

export function classifyApiError(error: unknown): ApiErrorInfo {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return { kind: 'network', status: 0 };
    }
    if (error.status === 404) {
      return { kind: 'not-found', status: 404 };
    }
    if (error.status === 400) {
      return { kind: 'bad-request', status: 400 };
    }
    if (error.status >= 500) {
      return { kind: 'server', status: error.status };
    }
    return { kind: 'unknown', status: error.status };
  }

  if (error instanceof Error) {
    if (error.name === 'TimeoutError' || error.message === API_TIMEOUT_ERROR) {
      return { kind: 'timeout', status: null };
    }
    if (
      error.message === INVALID_SINGLE_PAYLOAD_ERROR ||
      error.message === INVALID_LIST_PAYLOAD_ERROR
    ) {
      return { kind: 'payload-invalid', status: null };
    }
  }

  return { kind: 'unknown', status: null };
}

export function buildListErrorMessage(contextLabel: string, error: unknown): string {
  const normalizedContext = contextLabel.trim();
  const apiError = classifyApiError(error);

  if (apiError.kind === 'timeout') {
    return `Il caricamento di ${normalizedContext} richiede piu tempo del previsto. Verifica la connessione e riprova.`;
  }

  if (apiError.kind === 'network') {
    return `Il servizio non e raggiungibile al momento. Impossibile caricare ${normalizedContext}.`;
  }

  if (apiError.kind === 'server') {
    return `Si e verificato un errore del server durante il caricamento di ${normalizedContext}. Riprova tra poco.`;
  }

  if (apiError.kind === 'payload-invalid') {
    return `I dati ricevuti per ${normalizedContext} non sono validi. Riprova piu tardi.`;
  }

  return `Impossibile caricare ${normalizedContext}. Riprova tra poco.`;
}

export function buildSearchErrorMessage(error: unknown): string {
  const apiError = classifyApiError(error);

  if (apiError.kind === 'timeout') {
    return 'La ricerca sta impiegando troppo tempo. Verifica la connessione e riprova.';
  }

  if (apiError.kind === 'network') {
    return 'Il servizio di ricerca non e raggiungibile al momento. Riprova tra poco.';
  }

  if (apiError.kind === 'server') {
    return 'Il server ha restituito un errore durante la ricerca. Riprova tra poco.';
  }

  if (apiError.kind === 'payload-invalid') {
    return 'I risultati ricevuti non sono validi. Riprova tra poco.';
  }

  return 'Impossibile recuperare i risultati. Riprova tra poco.';
}
