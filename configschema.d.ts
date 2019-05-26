/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export interface Configschema {
  twitch?: {
    enable?: boolean;
    clientID: string;
    clientSecret: string;
    redirectURI: string;
    channelName?: string;
    ffzIntegration?: boolean;
    ffzUseRepeater?: boolean;
    streamTitle?: string;
    streamDefaultGame?: string;
  };
  schedule?: {
    defaultURL?: string;
    ignoreGamesWhileImporting?: string[];
    disableSpeedrunComLookup?: boolean;
    customData?: {
      name: string;
      key: string;
    }[];
  };
}
