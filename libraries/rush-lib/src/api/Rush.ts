// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { IPackageJson, ITerminalProvider, PackageJsonLookup } from '@rushstack/node-core-library';

import { RushCommandLineParser } from '../cli/RushCommandLineParser';
import { RushStartupBanner } from '../cli/RushStartupBanner';
import { RushXCommandLine } from '../cli/RushXCommandLine';
import { CommandLineMigrationAdvisor } from '../cli/CommandLineMigrationAdvisor';
import { EnvironmentVariableNames } from './EnvironmentConfiguration';
import { IBuiltInPluginConfiguration } from '../pluginFramework/PluginLoader/BuiltInPluginLoader';
import { RushPnpmCommandLine } from '../cli/RushPnpmCommandLine';

/**
 * Options to pass to the rush "launch" functions.
 *
 * @public
 */
export interface ILaunchOptions {
  /**
   * True if the tool was invoked from within a project with a rush.json file, otherwise false. We
   * consider a project without a rush.json to be "unmanaged" and we'll print that to the command line when
   * the tool is executed. This is mainly used for debugging purposes.
   */
  isManaged: boolean;

  /**
   * If true, the wrapper process already printed a warning that the version of Node.js hasn't been tested
   * with this version of Rush, so we shouldn't print a similar error.
   */
  alreadyReportedNodeTooNewError?: boolean;

  /**
   * Used to specify Rush plugins that are dependencies of the "\@microsoft/rush" package.
   *
   * @internal
   */
  builtInPluginConfigurations?: IBuiltInPluginConfiguration[];

  /**
   * Used to specify terminal how to write a message
   */
  terminalProvider?: ITerminalProvider;
}

/**
 * General operations for the Rush engine.
 *
 * @public
 */
export class Rush {
  private static __rushLibPackageJson: IPackageJson | undefined = undefined;

  /**
   * This API is used by the `@microsoft/rush` front end to launch the "rush" command-line.
   * Third-party tools should not use this API.  Instead, they should execute the "rush" binary
   * and start a new Node.js process.
   *
   * @remarks
   * Earlier versions of the rush frontend used a different API contract. In the old contract,
   * the second argument was the `isManaged` value of the {@link ILaunchOptions} object.
   *
   * Even though this API isn't documented, it is still supported for legacy compatibility.
   */
  public static launch(launcherVersion: string, arg: ILaunchOptions): void {
    const options: ILaunchOptions = Rush._normalizeLaunchOptions(arg);

    if (!RushCommandLineParser.shouldRestrictConsoleOutput()) {
      RushStartupBanner.logBanner(Rush.version, options.isManaged);
    }

    if (!CommandLineMigrationAdvisor.checkArgv(process.argv)) {
      // The migration advisor recognized an obsolete command-line
      process.exitCode = 1;
      return;
    }

    Rush._assignRushInvokedFolder();
    const parser: RushCommandLineParser = new RushCommandLineParser({
      alreadyReportedNodeTooNewError: options.alreadyReportedNodeTooNewError,
      builtInPluginConfigurations: options.builtInPluginConfigurations
    });
    parser.execute().catch(console.error); // CommandLineParser.execute() should never reject the promise
  }

  /**
   * This API is used by the `@microsoft/rush` front end to launch the "rushx" command-line.
   * Third-party tools should not use this API.  Instead, they should execute the "rushx" binary
   * and start a new Node.js process.
   */
  public static launchRushX(launcherVersion: string, options: ILaunchOptions): void {
    options = Rush._normalizeLaunchOptions(options);

    Rush._assignRushInvokedFolder();
    RushXCommandLine._launchRushXInternal(launcherVersion, { ...options });
  }

  /**
   * This API is used by the `@microsoft/rush` front end to launch the "rush-pnpm" command-line.
   * Third-party tools should not use this API.  Instead, they should execute the "rush-pnpm" binary
   * and start a new Node.js process.
   */
  public static launchRushPnpm(launcherVersion: string, options: ILaunchOptions): void {
    Rush._assignRushInvokedFolder();
    RushPnpmCommandLine.launch(launcherVersion, { ...options });
  }

  /**
   * The currently executing version of the "rush-lib" library.
   * This is the same as the Rush tool version for that release.
   */
  public static get version(): string {
    return this._rushLibPackageJson.version;
  }

  /**
   * @internal
   */
  public static get _rushLibPackageJson(): IPackageJson {
    if (!Rush.__rushLibPackageJson) {
      Rush.__rushLibPackageJson = PackageJsonLookup.loadOwnPackageJson(__dirname);
    }

    return Rush.__rushLibPackageJson;
  }

  /**
   * Assign the `RUSH_INVOKED_FOLDER` environment variable during startup.  This is only applied when
   * Rush is invoked via the CLI, not via the `@microsoft/rush-lib` automation API.
   *
   * @remarks
   * Modifying the parent process's environment is not a good design.  The better design is (1) to consolidate
   * Rush's code paths that invoke scripts, and (2) to pass down the invoked folder with each code path,
   * so that it can finally be applied in a centralized helper like `Utilities._createEnvironmentForRushCommand()`.
   * The natural time to do that refactoring is when we rework `Utilities.executeCommand()` to use
   * `Executable.spawn()` or rushell.
   */
  private static _assignRushInvokedFolder(): void {
    process.env[EnvironmentVariableNames.RUSH_INVOKED_FOLDER] = process.cwd();
  }

  /**
   * This function normalizes legacy options to the current {@link ILaunchOptions} object.
   */
  private static _normalizeLaunchOptions(arg: ILaunchOptions): ILaunchOptions {
    return typeof arg === 'boolean'
      ? { isManaged: arg } // In older versions of Rush, this the `launch` functions took a boolean arg for "isManaged"
      : arg;
  }
}
