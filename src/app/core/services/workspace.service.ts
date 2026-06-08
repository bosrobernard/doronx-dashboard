import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, WorkspaceSetup, WorkspaceConfig } from '../models';

const BASE = environment.apiUrl + environment.smartInvoicingPath;

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  constructor(private http: HttpClient) {}

  getSetup(): Observable<ApiResponse<WorkspaceSetup>> {
    return this.http.get<ApiResponse<WorkspaceSetup>>(`${BASE}/workspace/setup`);
  }

  getConfig(): Observable<ApiResponse<WorkspaceConfig>> {
    return this.http.get<ApiResponse<WorkspaceConfig>>(`${BASE}/workspace/config`);
  }

  getMeta(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${BASE}/meta`);
  }
}
