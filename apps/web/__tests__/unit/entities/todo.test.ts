import { Todo } from '@/entities/todo/Todo'

describe('Todo Entity', () => {
  const mockTodoData = {
    id: 'test-id',
    user_id: 'user-123',
    content: 'Test todo content',
    completed: false,
    order_index: 0,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  }

  describe('fromDatabase', () => {
    it('should create a Todo instance from database data', () => {
      const todo = Todo.fromDatabase(mockTodoData)

      expect(todo.id).toBe(mockTodoData.id)
      expect(todo.userId).toBe(mockTodoData.user_id)
      expect(todo.content).toBe(mockTodoData.content)
      expect(todo.completed).toBe(mockTodoData.completed)
      expect(todo.orderIndex).toBe(mockTodoData.order_index)
      expect(todo.createdAt).toBeInstanceOf(Date)
      expect(todo.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('create', () => {
    it('should create new todo data with validation', () => {
      const todoData = Todo.create('user-123', 'New todo', 5)

      expect(todoData.userId).toBe('user-123')
      expect(todoData.content).toBe('New todo')
      expect(todoData.completed).toBe(false)
      expect(todoData.orderIndex).toBe(5)
    })

    it('should throw error for empty content', () => {
      expect(() => Todo.create('user-123', '   ', 0)).toThrow('할일 내용은 필수입니다.')
    })

    it('should throw error for content over 200 characters', () => {
      const longContent = 'a'.repeat(201)
      expect(() => Todo.create('user-123', longContent, 0)).toThrow('할일 내용은 200자를 초과할 수 없습니다.')
    })

    it('should throw error for negative order index', () => {
      expect(() => Todo.create('user-123', 'Test', -1)).toThrow('순서는 0 이상이어야 합니다.')
    })
  })

  describe('toDatabase', () => {
    it('should convert Todo instance to database format', () => {
      const todo = Todo.fromDatabase(mockTodoData)
      const dbData = todo.toDatabase()

      expect(dbData.id).toBe(mockTodoData.id)
      expect(dbData.user_id).toBe(mockTodoData.user_id)
      expect(dbData.content).toBe(mockTodoData.content)
      expect(dbData.completed).toBe(mockTodoData.completed)
      expect(dbData.order_index).toBe(mockTodoData.order_index)
      expect(dbData.created_at).toBe(mockTodoData.created_at)
      expect(dbData.updated_at).toBe(mockTodoData.updated_at)
    })
  })

  describe('toggle', () => {
    it('should toggle the completed status', () => {
      const todo = Todo.fromDatabase(mockTodoData)
      const toggledTodo = todo.toggle()

      expect(toggledTodo.completed).toBe(!mockTodoData.completed)
      expect(toggledTodo.id).toBe(todo.id)
      expect(toggledTodo.content).toBe(todo.content)
      // 업데이트 시간이 갱신되는지 확인
      expect(toggledTodo.updatedAt.getTime()).toBeGreaterThan(todo.updatedAt.getTime())
    })
  })

  describe('complete', () => {
    it('should mark todo as completed', () => {
      const todo = Todo.fromDatabase({ ...mockTodoData, completed: false })
      const completedTodo = todo.complete()

      expect(completedTodo.completed).toBe(true)
      expect(completedTodo.updatedAt.getTime()).toBeGreaterThan(todo.updatedAt.getTime())
    })

    it('should return same instance if already completed', () => {
      const todo = Todo.fromDatabase({ ...mockTodoData, completed: true })
      const result = todo.complete()

      expect(result).toBe(todo)
    })
  })

  describe('uncomplete', () => {
    it('should mark todo as uncompleted', () => {
      const todo = Todo.fromDatabase({ ...mockTodoData, completed: true })
      const uncompletedTodo = todo.uncomplete()

      expect(uncompletedTodo.completed).toBe(false)
      expect(uncompletedTodo.updatedAt.getTime()).toBeGreaterThan(todo.updatedAt.getTime())
    })

    it('should return same instance if already uncompleted', () => {
      const todo = Todo.fromDatabase({ ...mockTodoData, completed: false })
      const result = todo.uncomplete()

      expect(result).toBe(todo)
    })
  })

  describe('updateContent', () => {
    it('should update the todo content', () => {
      const todo = Todo.fromDatabase(mockTodoData)
      const newContent = 'Updated content'
      const updatedTodo = todo.updateContent(newContent)

      expect(updatedTodo.content).toBe(newContent)
      expect(updatedTodo.id).toBe(todo.id)
      expect(updatedTodo.completed).toBe(todo.completed)
    })

    it('should throw error for empty content', () => {
      const todo = Todo.fromDatabase(mockTodoData)
      expect(() => todo.updateContent('   ')).toThrow('할일 내용은 필수입니다.')
    })

    it('should return same instance if content is unchanged', () => {
      const todo = Todo.fromDatabase(mockTodoData)
      const result = todo.updateContent(mockTodoData.content)

      expect(result).toBe(todo)
    })
  })

  describe('updateOrder', () => {
    it('should update the order index', () => {
      const todo = Todo.fromDatabase(mockTodoData)
      const newOrder = 5
      const updatedTodo = todo.updateOrder(newOrder)

      expect(updatedTodo.orderIndex).toBe(newOrder)
      expect(updatedTodo.id).toBe(todo.id)
      expect(updatedTodo.content).toBe(todo.content)
    })

    it('should throw error for negative order index', () => {
      const todo = Todo.fromDatabase(mockTodoData)
      expect(() => todo.updateOrder(-1)).toThrow('순서는 0 이상이어야 합니다.')
    })

    it('should return same instance if order is unchanged', () => {
      const todo = Todo.fromDatabase(mockTodoData)
      const result = todo.updateOrder(mockTodoData.order_index)

      expect(result).toBe(todo)
    })
  })

  describe('computed properties', () => {
    it('should calculate days since created', () => {
      const createdDate = new Date()
      createdDate.setDate(createdDate.getDate() - 5)
      const todo = Todo.fromDatabase({
        ...mockTodoData,
        created_at: createdDate.toISOString(),
      })

      expect(todo.daysSinceCreated).toBe(5)
    })

    it('should return null for days since completed if not completed', () => {
      const todo = Todo.fromDatabase({ ...mockTodoData, completed: false })
      expect(todo.daysSinceCompleted).toBe(null)
    })

    it('should calculate days since completed if completed', () => {
      const updatedDate = new Date()
      updatedDate.setDate(updatedDate.getDate() - 3)
      const todo = Todo.fromDatabase({
        ...mockTodoData,
        completed: true,
        updated_at: updatedDate.toISOString(),
      })

      expect(todo.daysSinceCompleted).toBe(3)
    })

    it('should return correct status icon', () => {
      const uncompletedTodo = Todo.fromDatabase({ ...mockTodoData, completed: false })
      const completedTodo = Todo.fromDatabase({ ...mockTodoData, completed: true })

      expect(uncompletedTodo.statusIcon).toBe('⭕')
      expect(completedTodo.statusIcon).toBe('✅')
    })

    it('should determine if todo is old', () => {
      const newDate = new Date()
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 10)

      const newTodo = Todo.fromDatabase({
        ...mockTodoData,
        created_at: newDate.toISOString(),
      })
      const oldTodo = Todo.fromDatabase({
        ...mockTodoData,
        created_at: oldDate.toISOString(),
      })

      expect(newTodo.isOld).toBe(false)
      expect(oldTodo.isOld).toBe(true)
    })
  })

  describe('toRepositoryItemData', () => {
    it('should convert to repository item data', () => {
      const todo = Todo.fromDatabase(mockTodoData)
      const repoData = todo.toRepositoryItemData()

      expect(repoData.type).toBe('todo')
      expect(repoData.title).toBe(mockTodoData.content)
      expect(repoData.content).toBe(mockTodoData.content)
      expect(repoData.source_id).toBe(mockTodoData.id)
    })

    it('should truncate long titles', () => {
      const longContent = 'This is a very long todo content that should be truncated'
      const todo = Todo.fromDatabase({ ...mockTodoData, content: longContent })
      const repoData = todo.toRepositoryItemData()

      expect(repoData.title).toBe('This is a very long todo conte...')
      expect(repoData.content).toBe(longContent)
    })
  })
})