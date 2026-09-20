interface Scorm12API {
    LMSInitialize(param: string): string
    LMSGetValue(element: string): string
    LMSSetValue(
      element: string,
      value: string
    ): string
    LMSCommit(param: string): string
    LMSFinish(param: string): string
    LMSGetLastError(): string
    LMSGetErrorString(errorCode: string): string
    LMSGetDiagnostic(errorCode: string): string
  }
  
  interface Window {
    API?: Scorm12API
  }