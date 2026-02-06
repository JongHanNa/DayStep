/**
 * OpenAPI 3.0 스키마
 *
 * ChatGPT Actions 호환 API 문서
 */

export function getOpenApiSchema(baseUrl: string) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'DayStep API',
      version: '1.0.0',
      description: 'ADHD 친화적 할일 관리 앱 API. ChatGPT Actions를 통해 할일을 관리할 수 있습니다.',
      contact: {
        name: 'DayStep Support',
      },
    },
    servers: [
      {
        url: baseUrl,
        description: 'DayStep MCP Server',
      },
    ],
    paths: {
      // ========== Projects ==========
      '/api/v1/projects': {
        get: {
          operationId: 'listProjects',
          summary: '프로젝트 목록 조회',
          description: '사용자의 프로젝트 목록을 조회합니다. 상태로 필터링할 수 있습니다.',
          tags: ['Projects'],
          parameters: [
            {
              name: 'status',
              in: 'query',
              description: '상태 필터',
              schema: { type: 'string', enum: ['active', 'completed', 'abandoned'] },
            },
            {
              name: 'limit',
              in: 'query',
              description: '최대 개수 (기본값: 50, 최대: 100)',
              schema: { type: 'integer', default: 50, maximum: 100 },
            },
            {
              name: 'offset',
              in: 'query',
              description: '시작 위치',
              schema: { type: 'integer', default: 0 },
            },
          ],
          responses: {
            '200': {
              description: '프로젝트 목록',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Project' },
                      },
                      meta: { $ref: '#/components/schemas/PaginationMeta' },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          operationId: 'createProject',
          summary: '프로젝트 생성',
          description: '새로운 프로젝트를 생성합니다.',
          tags: ['Projects'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateProjectInput' },
              },
            },
          },
          responses: {
            '201': {
              description: '생성된 프로젝트',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Project' },
                },
              },
            },
            '400': {
              description: '잘못된 요청',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/v1/projects/{id}': {
        get: {
          operationId: 'getProject',
          summary: '프로젝트 상세 조회',
          description: '특정 프로젝트의 상세 정보를 조회합니다.',
          tags: ['Projects'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: '프로젝트 ID',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': {
              description: '프로젝트 상세',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Project' },
                },
              },
            },
            '404': {
              description: '프로젝트를 찾을 수 없음',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
        patch: {
          operationId: 'updateProject',
          summary: '프로젝트 수정',
          description: '프로젝트를 수정합니다.',
          tags: ['Projects'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: '프로젝트 ID',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateProjectInput' },
              },
            },
          },
          responses: {
            '200': {
              description: '수정된 프로젝트',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Project' },
                },
              },
            },
            '404': {
              description: '프로젝트를 찾을 수 없음',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
        delete: {
          operationId: 'deleteProject',
          summary: '프로젝트 삭제',
          description: '프로젝트를 삭제합니다.',
          tags: ['Projects'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: '프로젝트 ID',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '204': {
              description: '삭제 성공',
            },
            '404': {
              description: '프로젝트를 찾을 수 없음',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/v1/projects/{id}/complete': {
        post: {
          operationId: 'completeProject',
          summary: '프로젝트 완료',
          description: '프로젝트를 완료 처리합니다.',
          tags: ['Projects'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: '프로젝트 ID',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': {
              description: '완료된 프로젝트',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Project' },
                },
              },
            },
            '404': {
              description: '프로젝트를 찾을 수 없음',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/v1/projects/with-todos': {
        post: {
          operationId: 'createProjectWithTodos',
          summary: '프로젝트와 할일 일괄 생성',
          description: 'AI 플래닝 결과를 프로젝트와 할일들로 일괄 생성합니다. ADHD 친화적 계획 수립에 최적화되어 있습니다.',
          tags: ['Projects'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateProjectWithTodosInput' },
              },
            },
          },
          responses: {
            '201': {
              description: '생성된 프로젝트와 할일',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      project: { $ref: '#/components/schemas/Project' },
                      todos: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Todo' },
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: '잘못된 요청',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      // ========== Todos ==========
      '/api/v1/todos': {
        get: {
          operationId: 'listTodos',
          summary: '할일 목록 조회',
          description: '사용자의 할일 목록을 조회합니다. 날짜, 완료 여부, 우선순위 등으로 필터링할 수 있습니다.',
          tags: ['Todos'],
          parameters: [
            {
              name: 'date',
              in: 'query',
              description: '특정 날짜의 할일만 조회 (today, tomorrow, YYYY-MM-DD)',
              schema: { type: 'string' },
            },
            {
              name: 'start_date',
              in: 'query',
              description: '시작 날짜 (date_range)',
              schema: { type: 'string' },
            },
            {
              name: 'end_date',
              in: 'query',
              description: '종료 날짜 (date_range)',
              schema: { type: 'string' },
            },
            {
              name: 'completed',
              in: 'query',
              description: '완료 여부 필터',
              schema: { type: 'boolean' },
            },
            {
              name: 'priority',
              in: 'query',
              description: '우선순위 필터',
              schema: { type: 'string', enum: ['low', 'medium', 'high'] },
            },
            {
              name: 'project_id',
              in: 'query',
              description: '프로젝트 ID 필터',
              schema: { type: 'string', format: 'uuid' },
            },
            {
              name: 'schedule_type',
              in: 'query',
              description: '일정 타입 필터',
              schema: { type: 'string', enum: ['all_day', 'timed', 'anytime', 'none'] },
            },
            {
              name: 'limit',
              in: 'query',
              description: '최대 개수 (기본값: 50, 최대: 100)',
              schema: { type: 'integer', default: 50, maximum: 100 },
            },
            {
              name: 'offset',
              in: 'query',
              description: '시작 위치',
              schema: { type: 'integer', default: 0 },
            },
          ],
          responses: {
            '200': {
              description: '할일 목록',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Todo' },
                      },
                      meta: { $ref: '#/components/schemas/PaginationMeta' },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          operationId: 'createTodo',
          summary: '할일 생성',
          description: '새로운 할일을 생성합니다.',
          tags: ['Todos'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateTodoInput' },
              },
            },
          },
          responses: {
            '201': {
              description: '생성된 할일',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Todo' },
                },
              },
            },
            '400': {
              description: '잘못된 요청',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/v1/todos/{id}': {
        get: {
          operationId: 'getTodo',
          summary: '할일 상세 조회',
          description: '특정 할일의 상세 정보를 조회합니다.',
          tags: ['Todos'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: '할일 ID',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': {
              description: '할일 상세',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Todo' },
                },
              },
            },
            '404': {
              description: '할일을 찾을 수 없음',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
        patch: {
          operationId: 'updateTodo',
          summary: '할일 수정',
          description: '할일을 수정합니다.',
          tags: ['Todos'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: '할일 ID',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateTodoInput' },
              },
            },
          },
          responses: {
            '200': {
              description: '수정된 할일',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Todo' },
                },
              },
            },
            '404': {
              description: '할일을 찾을 수 없음',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
        delete: {
          operationId: 'deleteTodo',
          summary: '할일 삭제',
          description: '할일을 삭제합니다.',
          tags: ['Todos'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: '할일 ID',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '204': {
              description: '삭제 성공',
            },
            '404': {
              description: '할일을 찾을 수 없음',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/v1/todos/{id}/complete': {
        post: {
          operationId: 'completeTodo',
          summary: '할일 완료 상태 변경',
          description: '할일의 완료 상태를 변경합니다.',
          tags: ['Todos'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: '할일 ID',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    completed: {
                      type: 'boolean',
                      description: '완료 여부',
                    },
                  },
                  required: ['completed'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: '업데이트된 할일',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Todo' },
                },
              },
            },
            '404': {
              description: '할일을 찾을 수 없음',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        oauth2: {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: `${baseUrl}/oauth/authorize`,
              tokenUrl: `${baseUrl}/oauth/token`,
              scopes: {
                'projects:read': '프로젝트 조회',
                'projects:write': '프로젝트 생성/수정/삭제',
                'todos:read': '할일 조회',
                'todos:write': '할일 생성/수정/삭제',
              },
            },
          },
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Project: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: '프로젝트 ID' },
            title: { type: 'string', description: '제목' },
            description: { type: 'string', nullable: true, description: '설명' },
            status: {
              type: 'string',
              enum: ['active', 'completed', 'abandoned'],
              description: '상태',
            },
            icon: { type: 'string', nullable: true, description: '아이콘 (이모지)' },
            color: { type: 'string', description: '색상 (Hex 코드)' },
            order_index: { type: 'integer', description: '정렬 순서' },
            created_at: { type: 'string', format: 'date-time', description: '생성일' },
            updated_at: { type: 'string', format: 'date-time', description: '수정일' },
          },
        },
        CreateProjectInput: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', description: '프로젝트 제목' },
            description: { type: 'string', description: '설명' },
            status: {
              type: 'string',
              enum: ['active', 'completed', 'abandoned'],
              default: 'active',
              description: '상태',
            },
            icon: { type: 'string', description: '아이콘 (이모지)' },
            color: { type: 'string', description: '색상 (Hex 코드, 예: #A8DADC)' },
          },
        },
        UpdateProjectInput: {
          type: 'object',
          properties: {
            title: { type: 'string', description: '제목' },
            description: { type: 'string', nullable: true, description: '설명' },
            status: {
              type: 'string',
              enum: ['active', 'completed', 'abandoned'],
              description: '상태',
            },
            icon: { type: 'string', description: '아이콘' },
            color: { type: 'string', description: '색상' },
          },
        },
        CreateProjectWithTodosInput: {
          type: 'object',
          required: ['project', 'todos'],
          properties: {
            project: {
              type: 'object',
              required: ['title'],
              description: '프로젝트 정보',
              properties: {
                title: { type: 'string', description: '프로젝트 제목' },
                description: { type: 'string', description: '설명' },
                icon: { type: 'string', description: '이모지 아이콘' },
                color: { type: 'string', description: '색상 (Hex 코드)' },
              },
            },
            todos: {
              type: 'array',
              description: '할일 목록',
              items: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string', description: '할일 제목' },
                  start_time: { type: 'string', description: '시작일 (today, tomorrow, YYYY-MM-DD)' },
                  schedule_type: {
                    type: 'string',
                    enum: ['all_day', 'timed', 'anytime', 'none'],
                    description: '일정 타입',
                  },
                  priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: '우선순위',
                  },
                  anytime_duration: { type: 'integer', description: '예상 소요시간 (분)' },
                  subtasks: {
                    type: 'array',
                    description: '서브태스크 (5분 단위 작은 행동)',
                    items: {
                      type: 'object',
                      required: ['title'],
                      properties: {
                        title: { type: 'string', description: '서브태스크 제목' },
                        anytime_duration: { type: 'integer', description: '예상 소요시간 (분)' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        Todo: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: '할일 ID' },
            title: { type: 'string', description: '제목' },
            completed: { type: 'boolean', description: '완료 여부' },
            schedule_type: {
              type: 'string',
              enum: ['all_day', 'timed', 'anytime', 'none'],
              description: '일정 타입',
            },
            start_time: { type: 'string', format: 'date-time', nullable: true, description: '시작 시간' },
            end_time: { type: 'string', format: 'date-time', nullable: true, description: '종료 시간' },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: '우선순위',
            },
            project_id: { type: 'string', format: 'uuid', nullable: true, description: '프로젝트 ID' },
            recurrence_pattern: { type: 'string', description: '반복 패턴' },
            is_today_highlight: { type: 'boolean', description: '오늘 하이라이트' },
            icon: { type: 'string', nullable: true, description: '아이콘' },
            color: { type: 'string', description: '색상' },
            anytime_duration: { type: 'integer', nullable: true, description: '예상 소요시간 (분)' },
            order_index: { type: 'integer', description: '정렬 순서' },
            created_at: { type: 'string', format: 'date-time', description: '생성일' },
            updated_at: { type: 'string', format: 'date-time', description: '수정일' },
          },
        },
        CreateTodoInput: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', description: '제목' },
            schedule_type: {
              type: 'string',
              enum: ['all_day', 'timed', 'anytime', 'none'],
              default: 'none',
              description: '일정 타입',
            },
            start_time: { type: 'string', description: '시작 시간 (today, tomorrow, YYYY-MM-DD 또는 ISO datetime)' },
            end_time: { type: 'string', format: 'date-time', description: '종료 시간' },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              default: 'medium',
              description: '우선순위',
            },
            project_id: { type: 'string', format: 'uuid', description: '프로젝트 ID' },
            is_today_highlight: { type: 'boolean', default: false, description: '오늘 하이라이트' },
            icon: { type: 'string', description: '아이콘' },
            color: { type: 'string', description: '색상' },
            anytime_duration: { type: 'integer', description: '예상 소요시간 (분)' },
          },
        },
        UpdateTodoInput: {
          type: 'object',
          properties: {
            title: { type: 'string', description: '제목' },
            schedule_type: {
              type: 'string',
              enum: ['all_day', 'timed', 'anytime', 'none'],
              description: '일정 타입',
            },
            start_time: { type: 'string', nullable: true, description: '시작 시간' },
            end_time: { type: 'string', nullable: true, description: '종료 시간' },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: '우선순위',
            },
            completed: { type: 'boolean', description: '완료 여부' },
            project_id: { type: 'string', format: 'uuid', nullable: true, description: '프로젝트 ID' },
            is_today_highlight: { type: 'boolean', description: '오늘 하이라이트' },
            icon: { type: 'string', description: '아이콘' },
            color: { type: 'string', description: '색상' },
            anytime_duration: { type: 'integer', description: '예상 소요시간 (분)' },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            total: { type: 'integer', description: '전체 개수' },
            limit: { type: 'integer', description: '페이지 크기' },
            offset: { type: 'integer', description: '시작 위치' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'integer', description: 'HTTP 상태 코드' },
                message: { type: 'string', description: '에러 메시지' },
                details: { type: 'object', description: '추가 정보' },
              },
            },
          },
        },
      },
    },
    security: [{ oauth2: ['projects:read', 'projects:write', 'todos:read', 'todos:write'] }, { bearerAuth: [] }],
  };
}
