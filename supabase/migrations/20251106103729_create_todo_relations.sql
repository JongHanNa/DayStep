-- Create todo_projects junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS todo_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(todo_id, project_id)
);

-- Create todo_notes junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS todo_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(todo_id, note_id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_todo_projects_todo_id ON todo_projects(todo_id);
CREATE INDEX IF NOT EXISTS idx_todo_projects_project_id ON todo_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_todo_notes_todo_id ON todo_notes(todo_id);
CREATE INDEX IF NOT EXISTS idx_todo_notes_note_id ON todo_notes(note_id);

-- Enable Row Level Security
ALTER TABLE todo_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for todo_projects
CREATE POLICY "Users can view their own todo_projects"
  ON todo_projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM todos
      WHERE todos.id = todo_projects.todo_id
      AND todos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own todo_projects"
  ON todo_projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM todos
      WHERE todos.id = todo_projects.todo_id
      AND todos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own todo_projects"
  ON todo_projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM todos
      WHERE todos.id = todo_projects.todo_id
      AND todos.user_id = auth.uid()
    )
  );

-- Create RLS policies for todo_notes
CREATE POLICY "Users can view their own todo_notes"
  ON todo_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM todos
      WHERE todos.id = todo_notes.todo_id
      AND todos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own todo_notes"
  ON todo_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM todos
      WHERE todos.id = todo_notes.todo_id
      AND todos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own todo_notes"
  ON todo_notes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM todos
      WHERE todos.id = todo_notes.todo_id
      AND todos.user_id = auth.uid()
    )
  );
