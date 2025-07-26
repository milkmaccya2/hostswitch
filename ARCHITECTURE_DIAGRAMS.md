# HostSwitch アーキテクチャ図

## 現在のアーキテクチャ（実装済み）

```mermaid
graph TB
    subgraph "Entry Point"
        A[hostswitch.ts]
    end
    
    subgraph "CLI Layer - Controller"
        B[CliController]
    end
    
    subgraph "CLI Layer - UI"
        C[CliUserInterface]
        D[InteractiveUserInterface]
        E[IUserInterface<br/><<interface>>]
    end
    
    subgraph "CLI Layer - Commands"
        F[ICommand<br/><<interface>>]
        G[ListProfilesCommand]
        H[CreateProfileCommand]
        I[SwitchProfileCommand]
        J[EditProfileCommand]
        K[ShowProfileCommand]
        L[DeleteProfileCommand]
    end
    
    subgraph "CLI Layer - Facade"
        M[HostSwitchFacade]
    end
    
    subgraph "Core Layer"
        N[HostSwitchService]
        O[ProfileManager]
        P[CurrentProfileManager]
        Q[BackupManager]
    end
    
    subgraph "Infrastructure Layer"
        R[FileSystemAdapter]
        S[ChalkLogger]
        T[ProcessManager]
        U[PermissionChecker]
    end
    
    %% Entry Point
    A --> B
    
    %% Controller connections
    B --> E
    B --> F
    B --> M
    
    %% UI implementations
    C -.->|implements| E
    D -.->|implements| E
    D --> inquirer[inquirer.js]
    C --> commander[commander.js]
    
    %% Command implementations
    G -.->|implements| F
    H -.->|implements| F
    I -.->|implements| F
    J -.->|implements| F
    K -.->|implements| F
    L -.->|implements| F
    
    %% Commands use Facade
    G --> M
    H --> M
    I --> M
    J --> M
    K --> M
    L --> M
    
    %% Facade uses Core and Infrastructure
    M --> N
    M --> S
    M --> T
    M --> U
    
    %% Core Layer connections
    N --> O
    N --> P
    N --> Q
    N --> R
    N --> S
    N --> U
    
    O --> R
    P --> R
    Q --> R
    
    %% Infrastructure connections
    R --> fs[fs-extra]
    S --> chalk[chalk]
    
    style A fill:#f9f,stroke:#333,stroke-width:4px
    style M fill:#aaf,stroke:#333,stroke-width:3px
    style B fill:#afa,stroke:#333,stroke-width:3px
    style E fill:#ffa,stroke:#333,stroke-width:2px
    style F fill:#ffa,stroke:#333,stroke-width:2px
```

## アーキテクチャの利点

### 1. 単一責任の原則（SRP）
- **CliController**: コマンドのディスパッチのみ担当
- **Command Classes**: 各コマンドの実行ロジックのみ担当
- **HostSwitchFacade**: ビジネス操作の統一インターフェースのみ提供
- **UI Classes**: ユーザーインタラクションのみ担当

### 2. 開放/閉鎖の原則（OCP）
- 新しいコマンドの追加が既存コードを変更せずに可能
- ICommandインターフェースを実装するだけで新機能追加可能

### 3. 依存性逆転の原則（DIP）
- 上位モジュールは下位モジュールに依存せず、抽象に依存
- IUserInterface、ICommand等のインターフェースを通じた疎結合

### 4. インターフェース分離の原則（ISP）
- 小さく特化したインターフェース（ICommand、IUserInterface）
- クライアントは必要なメソッドのみに依存

### 5. テスタビリティの向上
- 各コンポーネントが独立してテスト可能
- モックを使用した単体テストが容易
- 依存性注入によるテストの柔軟性

## データフロー図

```mermaid
sequenceDiagram
    participant User
    participant UI as InteractiveUserInterface
    participant Controller as CliController
    participant Command as SwitchProfileCommand
    participant Facade as HostSwitchFacade
    participant Service as HostSwitchService
    participant Permission as PermissionChecker
    
    User->>UI: 引数なしで実行
    UI->>UI: showMainMenu()
    UI->>User: メニュー表示
    User->>UI: "Switch profile"選択
    
    UI->>UI: handleSwitchProfile()
    UI->>Facade: listProfiles()
    Facade->>Service: getProfiles()
    Service-->>Facade: ProfileInfo[]
    Facade-->>UI: ICommandResult
    
    UI->>User: プロファイル選択プロンプト
    User->>UI: "staging"選択
    
    UI->>Controller: executeCommand('switch', {name: 'staging'})
    Controller->>Controller: createCommand()
    Controller->>Command: new SwitchProfileCommand(facade, 'staging')
    Controller->>Command: execute()
    
    Command->>Facade: switchProfile('staging')
    Facade->>Service: profileExists('staging')
    Service-->>Facade: true
    
    Facade->>Permission: requiresSudo()
    Permission-->>Facade: true
    
    Facade-->>Command: ICommandResult {requiresSudo: true}
    Command-->>Controller: ICommandResult
    Controller->>UI: handleCommandResult()
    
    UI->>UI: handleSudoRequired()
    UI->>Facade: switchProfileWithSudo('staging')
    Facade->>Permission: rerunWithSudo(['switch', 'staging'])
    Permission-->>Facade: SudoResult
    Facade-->>UI: ICommandResult
    
    UI->>User: 結果表示
```

## クラス構造図

```mermaid
classDiagram
    class ICommand {
        <<interface>>
        +execute() Promise~ICommandResult~
    }
    
    class ICommandResult {
        <<interface>>
        +success: boolean
        +message?: string
        +data?: any
        +requiresConfirmation?: boolean
        +requiresSudo?: boolean
        +sudoCommand?: string
    }
    
    class IUserInterface {
        <<interface>>
        +showMessage(message, type) void
        +promptConfirm(message) Promise~boolean~
        +promptSelect(message, choices) Promise~T~
        +promptInput(message, validator) Promise~string~
        +handleCommandResult(result) Promise~void~
    }
    
    class HostSwitchFacade {
        -hostSwitchService: HostSwitchService
        -logger: ILogger
        -processManager: IProcessManager
        -permissionChecker: IPermissionChecker
        +listProfiles() Promise~ICommandResult~
        +createProfile(name, fromCurrent) Promise~ICommandResult~
        +switchProfile(name) Promise~ICommandResult~
        +switchProfileWithSudo(name) Promise~ICommandResult~
        +deleteProfile(name) Promise~ICommandResult~
        +showProfile(name) Promise~ICommandResult~
        +editProfile(name) Promise~ICommandResult~
        +getCurrentProfile() string|null
        +getDeletableProfiles() ProfileInfo[]
        -validateProfileName(name) ICommandResult
    }
    
    class CliController {
        -facade: HostSwitchFacade
        -ui: IUserInterface
        +executeCommand(commandType, params) Promise~void~
        -createCommand(type, params) ICommand
    }
    
    class InteractiveUserInterface {
        -facade: HostSwitchFacade
        -logger: ILogger
        +run() Promise~void~
        -showMainMenu() Promise~string~
        -executeAction(action) Promise~void~
        -handleListProfiles() Promise~void~
        -handleSwitchProfile() Promise~void~
        -handleCreateProfile() Promise~void~
        -handleSudoRequired(profileName) Promise~void~
        -handleCommandResult(result) Promise~void~
    }
    
    class SwitchProfileCommand {
        -facade: HostSwitchFacade
        -profileName: string
        +execute() Promise~ICommandResult~
    }
    
    class HostSwitchService {
        -profileManager: ProfileManager
        -currentProfileManager: CurrentProfileManager
        -backupManager: BackupManager
        +getProfiles() ProfileInfo[]
        +createProfile(name, fromCurrent) CreateProfileResult
        +switchProfile(name) Promise~SwitchResult~
        +deleteProfile(name) DeleteResult
        +getProfileContent(name) ProfileContentResult
        +profileExists(name) boolean
        +getProfilePath(name) string
        +getCurrentProfile() string|null
        +getConfig() HostSwitchConfig
    }
    
    ICommand <|.. SwitchProfileCommand
    ICommand <|.. CreateProfileCommand
    ICommand <|.. ListProfilesCommand
    ICommand <|.. DeleteProfileCommand
    ICommand <|.. EditProfileCommand
    ICommand <|.. ShowProfileCommand
    
    IUserInterface <|.. InteractiveUserInterface
    IUserInterface <|.. CliUserInterface
    
    CliController --> IUserInterface
    CliController --> HostSwitchFacade
    CliController --> ICommand
    
    InteractiveUserInterface --> HostSwitchFacade
    InteractiveUserInterface --> ILogger
    
    SwitchProfileCommand --> HostSwitchFacade
    
    HostSwitchFacade --> HostSwitchService
    HostSwitchFacade --> ILogger
    HostSwitchFacade --> IProcessManager
    HostSwitchFacade --> IPermissionChecker
```

## 実装状況

### ✅ 完了したフェーズ

1. **Phase 1: 基盤**
   - ICommandResultインターフェース定義 ✅
   - HostSwitchFacade実装 ✅
   - Facadeテスト ✅

2. **Phase 2: Command Pattern**
   - ICommandインターフェース定義 ✅
   - 各Commandクラス実装 ✅
   - Commandテスト ✅

3. **Phase 3: UI抽象化**
   - IUserInterfaceインターフェース定義 ✅
   - InteractiveUserInterface実装 ✅
   - CliUserInterface実装 ✅
   - UIテスト ✅

4. **Phase 4: 統合**
   - CliController実装 ✅
   - hostswitch.ts更新 ✅
   - 統合テスト ✅

5. **Phase 5: クリーンアップ**
   - 旧InteractiveMode削除 ✅
   - 旧CommandHandler削除 ✅
   - ドキュメント更新 ✅

### 🎉 アーキテクチャリファクタリング完了

すべてのフェーズが正常に完了し、クリーンアーキテクチャへの移行が成功しました。