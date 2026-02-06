# DayStep Widget Bridge

Capacitor plugin for iOS Widget data synchronization in the DayStep app.

## Overview

The Widget Bridge plugin enables seamless data synchronization between the DayStep web app and iOS home screen widgets. It provides real-time todo data sharing, background sync capabilities, and deep linking functionality.

## Features

- 📱 **iOS Widget Support**: Native iOS widget with 3 size variants (Small, Medium, Large)
- 🔄 **Real-time Sync**: Automatic data synchronization between app and widget
- 🚀 **Performance Optimized**: Data compression, caching, and diff algorithms
- 🔗 **Deep Linking**: Widget tap navigation to specific app sections
- 📊 **Background Sync**: Scheduled background updates with network detection
- 🎯 **Smart Filtering**: Priority-based todo filtering and optimization
- 📈 **Performance Monitoring**: Comprehensive metrics and diagnostics

## Installation

### 1. Install the Plugin

```bash
npm install @daystep/widget-bridge
npx cap sync
```

### 2. iOS Setup

#### Add App Groups Capability

1. Open Xcode project: `ios/App/App.xcodeproj`
2. Select App target → Signing & Capabilities
3. Add "App Groups" capability
4. Create/select group: `group.com.daystep.app`

#### Add Widget Extension

1. In Xcode: File → New → Target
2. Select "Widget Extension"
3. Product Name: `DayStepWidget`
4. Add App Groups capability to Widget target
5. Replace generated widget files with provided implementation

#### Configure URL Scheme

Add to `ios/App/App/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.daystep.app.deeplink</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>daystep</string>
        </array>
    </dict>
</array>
```

## Usage

### Basic Setup

```typescript
import { WidgetBridge } from '@daystep/widget-bridge';
import { widgetService } from './services/widget.service';

// Initialize widget service
await widgetService.initialize({
  autoSync: true,
  backgroundSync: true,
  maxTodos: 20
});
```

### Manual Sync

```typescript
// Sync todos manually
const todos = [
  {
    id: '1',
    title: 'Complete project',
    completed: false,
    priority: 'high',
    dueDate: '2024-01-15T10:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const result = await WidgetBridge.syncTodos({ todos });
console.log('Sync result:', result);
```

### React Integration

```tsx
import { WidgetSyncProvider, useWidgetSyncContext } from './components/mobile/WidgetSyncProvider';

function App() {
  return (
    <WidgetSyncProvider enableAutoSync={true}>
      <TodoApp />
    </WidgetSyncProvider>
  );
}

function TodoComponent() {
  const { 
    syncTodos, 
    isLoading, 
    isSupported, 
    stats 
  } = useWidgetSyncContext();

  useEffect(() => {
    if (isSupported) {
      syncTodos();
    }
  }, [todos]);

  return (
    <div>
      {isSupported && (
        <div>
          <p>Widget synced: {stats.syncedTodosCount} todos</p>
          {isLoading && <p>Syncing...</p>}
        </div>
      )}
    </div>
  );
}
```

### Deep Linking

```typescript
// Handle widget taps
WidgetBridge.addListener('widgetTapped', (data) => {
  console.log('Widget tapped:', data.section, data.todoId);
  // Navigate to specific section/todo
});

// Open app section from widget
await WidgetBridge.openApp({ 
  section: 'todos', 
  todoId: '123' 
});
```

## API Reference

### WidgetBridge

#### Methods

##### `syncTodos(options: SyncOptions): Promise<PluginResponse>`

Synchronizes todo data with the widget.

**Parameters:**
- `options.todos`: Array of WidgetTodo objects
- `options.maxItems`: Maximum number of todos to sync (default: 100)
- `options.force`: Force sync even if data hasn't changed

**Returns:** Promise with success status and message

##### `getTodos(): Promise<{ todos: WidgetTodo[]; count: number }>`

Retrieves currently stored widget data.

##### `clearTodos(): Promise<PluginResponse>`

Clears all widget data.

##### `reloadWidget(): Promise<PluginResponse>`

Requests widget refresh.

##### `getWidgetStatus(): Promise<WidgetStatus>`

Gets current widget status and metadata.

##### `scheduleUpdate(options?: ScheduleOptions): Promise<PluginResponse>`

Schedules background widget updates.

##### `openApp(options: { section?: string; todoId?: string }): Promise<PluginResponse>`

Opens app to specific section via deep linking.

#### Events

##### `widgetDataChanged`

Fired when widget data is updated.

```typescript
WidgetBridge.addListener('widgetDataChanged', (data) => {
  console.log('Widget updated:', data.todos.length, 'todos');
});
```

##### `widgetTapped`

Fired when user taps the widget.

```typescript
WidgetBridge.addListener('widgetTapped', (data) => {
  console.log('Tapped:', data.section, data.todoId);
});
```

### Data Types

#### WidgetTodo

```typescript
interface WidgetTodo {
  id: string;
  title: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;          // ISO 8601 format
  createdAt: string;         // ISO 8601 format
  updatedAt: string;         // ISO 8601 format
  category?: string;
  tags?: string[];
}
```

#### WidgetStatus

```typescript
interface WidgetStatus {
  isInstalled: boolean;
  lastUpdate?: string;
  syncedTodosCount: number;
  backgroundUpdateEnabled: boolean;
}
```

## Services

### WidgetService

Central service for managing all widget operations.

```typescript
import { widgetService } from './services/widget.service';

// Initialize
await widgetService.initialize({
  autoSync: true,
  backgroundSync: true,
  maxTodos: 20
});

// Manual operations
await widgetService.syncNow();
await widgetService.refresh();
await widgetService.clear();

// Get diagnostics
const diagnostics = await widgetService.getDiagnostics();
console.log('Widget metrics:', diagnostics);
```

### BackgroundSyncService

Handles background synchronization and scheduling.

```typescript
import { backgroundSyncService } from './services/background-sync.service';

// Start background sync
await backgroundSyncService.start({
  intervalMinutes: 30,
  enableBackgroundMode: true,
  detectNetworkChanges: true
});

// Check status
const status = backgroundSyncService.getStatus();
console.log('Background sync active:', status.isActive);
```

## Performance Optimization

### Data Optimization

The plugin includes built-in optimization features:

- **Smart Filtering**: Prioritizes incomplete, urgent, and recent todos
- **Data Compression**: Removes unnecessary fields and compresses payloads
- **Caching**: In-memory cache with TTL for frequently accessed data
- **Diff Detection**: Only syncs changed data to reduce overhead

### Performance Monitoring

```typescript
// Get performance metrics
const metrics = widgetService.getMetrics();
console.log('Sync performance:', {
  avgSyncTime: metrics.avgSyncTime,
  successRate: metrics.syncSuccessRate,
  compressionRatio: metrics.compressionRatio,
  cacheHitRate: metrics.cacheHitRate
});
```

## Widget Implementation

### iOS Widget Sizes

#### Small Widget (systemSmall)
- Displays 3 most important todos
- Shows completion counter
- Optimized for glanceable information

#### Medium Widget (systemMedium)
- Displays 5 todos with completion progress
- Circular progress indicator
- Priority indicators for high-priority items

#### Large Widget (systemLarge)
- Displays up to 10 todos grouped by priority
- Category-based organization
- Detailed progress visualization

### Widget Data Flow

```
Web App → WidgetBridge → UserDefaults (App Groups) → Widget Extension
                ↓
           Widget Timeline Update
```

## Troubleshooting

### Common Issues

#### Widget Not Updating
1. Check App Groups configuration
2. Verify Widget Extension is properly added
3. Ensure background app refresh is enabled
4. Check console logs for sync errors

#### Deep Linking Not Working
1. Verify URL scheme registration in Info.plist
2. Check AppDelegate URL handling implementation
3. Test with `xcrun simctl openurl booted daystep://todos`

#### Performance Issues
1. Monitor sync frequency and data size
2. Enable performance monitoring
3. Check cache hit rates
4. Optimize todo filtering criteria

### Debug Commands

```bash
# Check device logs
xcrun devicectl list devices
xcrun devicectl device log --device [DEVICE_ID] --filter daystep

# Simulator logs
xcrun simctl list devices
xcrun simctl logverbose booted enable
```

### Enable Debug Logging

```typescript
// Enable verbose logging
await widgetService.updateConfig({
  enablePerfMonitoring: true
});

// Get detailed diagnostics
const diagnostics = await widgetService.getDiagnostics();
console.log(JSON.stringify(diagnostics, null, 2));
```

## Development

### Building the Plugin

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Verify iOS implementation
npm run verify:ios

# Run tests
npm test
```

### Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/widget-enhancement`
3. Make changes and add tests
4. Submit pull request

## License

MIT License - see LICENSE file for details.

---

For more information, visit the [DayStep GitHub repository](https://github.com/JongHanNa/DayStep).