# Interactive周りのアーキテクチャ改善提案

## 現在の問題点

### 1. 責任の分離が不明確
- `CommandHandler`と`InteractiveMode`で同じような処理が重複
- UI固有の処理とビジネスロジックが混在
- エラーハンドリングの重複

### 2. 依存関係の複雑さ
- 両方のクラスが直接`HostSwitchService`に依存
- `InteractiveMode`が4つの依存関係を注入される
- テスト時のモック設定が複雑

### 3. 拡張性の問題
- 新しいUI形式（例：Web UI）を追加する際の影響範囲が大きい
- コマンド処理ロジックの再利用が困難

## 改善案: Command + Facade パターン

### 新しい構造

```
src/cli/
├── commands/
│   ├── ICommand.ts              # コマンド抽象化
│   ├── ListProfilesCommand.ts   # 各操作をコマンド化
│   ├── CreateProfileCommand.ts
│   ├── SwitchProfileCommand.ts
│   ├── EditProfileCommand.ts
│   ├── ShowProfileCommand.ts
│   └── DeleteProfileCommand.ts
├── facades/
│   └── HostSwitchFacade.ts      # 複雑な操作を隠蔽
├── interfaces/
│   ├── IUserInterface.ts        # UI共通インターフェース
│   └── ICommandResult.ts        # コマンド結果の統一
├── ui/
│   ├── CliUserInterface.ts      # CLI実装
│   └── InteractiveUserInterface.ts # Interactive実装
└── CliController.ts             # UIとCommandの調整
```

### 1. Command Pattern の導入

各操作をコマンドとして抽象化：

```typescript
// src/cli/commands/ICommand.ts
export interface ICommand {
  execute(): Promise<ICommandResult>;
}

export interface ICommandResult {
  success: boolean;
  message?: string;
  data?: any;
  requiresConfirmation?: boolean;
  requiresSudo?: boolean;
}

// src/cli/commands/SwitchProfileCommand.ts
export class SwitchProfileCommand implements ICommand {
  constructor(
    private facade: HostSwitchFacade,
    private profileName: string
  ) {}

  async execute(): Promise<ICommandResult> {
    // sudo権限チェック、確認プロンプトなどの共通処理
    return await this.facade.switchProfile(this.profileName);
  }
}
```

### 2. Facade Pattern でビジネスロジックを隠蔽

```typescript
// src/cli/facades/HostSwitchFacade.ts
export class HostSwitchFacade {
  constructor(
    private hostSwitchService: HostSwitchService,
    private permissionChecker: IPermissionChecker,
    private processManager: IProcessManager
  ) {}

  async switchProfile(name: string): Promise<ICommandResult> {
    // 複雑な権限チェック、sudo実行などの処理をここで実装
    const needsSudo = await this.permissionChecker.requiresSudo(
      this.hostSwitchService.getConfig().hostsPath
    );
    
    if (needsSudo) {
      return {
        success: false,
        requiresSudo: true,
        message: 'Requires sudo privileges'
      };
    }

    const result = await this.hostSwitchService.switchProfile(name);
    return {
      success: result.success,
      message: result.message,
      data: { backupPath: result.backupPath }
    };
  }
}
```

### 3. UI Interface の統一

```typescript
// src/cli/interfaces/IUserInterface.ts
export interface IUserInterface {
  showMessage(message: string, type: 'info' | 'success' | 'warn' | 'error'): void;
  promptConfirm(message: string): Promise<boolean>;
  promptSelect<T>(message: string, choices: Choice<T>[]): Promise<T>;
  promptInput(message: string, validator?: (input: string) => boolean | string): Promise<string>;
  handleCommandResult(result: ICommandResult): Promise<void>;
}

// src/cli/ui/InteractiveUserInterface.ts
export class InteractiveUserInterface implements IUserInterface {
  constructor(private logger: ILogger) {}

  async promptSelect<T>(message: string, choices: Choice<T>[]): Promise<T> {
    const { value } = await inquirer.prompt([{
      type: 'list',
      name: 'value',
      message,
      choices
    }]);
    return value;
  }

  async handleCommandResult(result: ICommandResult): Promise<void> {
    if (result.requiresSudo) {
      this.showMessage('⚠️  This operation requires sudo privileges', 'warn');
      // 自動sudo実行ロジック
    }
    // 結果に応じた処理
  }
}
```

### 4. Controller で統合

```typescript
// src/cli/CliController.ts
export class CliController {
  constructor(
    private facade: HostSwitchFacade,
    private ui: IUserInterface
  ) {}

  async executeCommand(commandType: string, params: any): Promise<void> {
    const command = this.createCommand(commandType, params);
    const result = await command.execute();
    await this.ui.handleCommandResult(result);
  }

  private createCommand(type: string, params: any): ICommand {
    switch (type) {
      case 'switch':
        return new SwitchProfileCommand(this.facade, params.name);
      case 'list':
        return new ListProfilesCommand(this.facade);
      // ...
    }
  }
}
```

## メリット

### 1. 責任の明確化
- **Command**: 各操作の実行ロジック
- **Facade**: 複雑なビジネスロジックの隠蔽
- **UI**: ユーザーインターフェース固有の処理
- **Controller**: UIとCommandの調整

### 2. 再利用性の向上
- コマンドロジックをUI間で共有可能
- 新しいUI（Web、TUI等）の追加が容易

### 3. テスタビリティの向上
- 各コンポーネントが独立してテスト可能
- モック作成の簡素化

### 4. 拡張性の向上
- 新しいコマンドの追加が容易
- UIロジックの変更がビジネスロジックに影響しない

## 実装順序

1. **Phase 1**: `ICommand`と`HostSwitchFacade`の実装
2. **Phase 2**: `IUserInterface`の導入と既存UIの移行
3. **Phase 3**: `CliController`による統合
4. **Phase 4**: 既存コードのリファクタリング

## 考慮点

- **互換性**: 既存のAPIとの互換性を保つ
- **段階的移行**: 一度にすべてを変更せず、段階的にリファクタリング
- **テスト**: 各段階でテストが通ることを確認