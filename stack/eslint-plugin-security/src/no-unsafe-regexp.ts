// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { TSESLint, TSESTree } from '@typescript-eslint/experimental-utils';
import { AST_NODE_TYPES } from '@typescript-eslint/experimental-utils';

import { MatchTree, TreeNode } from '@rushstack/tree-pattern';

// Matches an expression like this:
//   new RegExp('hello');
//
// Tree:
//   {
//     "type": "NewExpression",
//     "callee": {
//       "type": "Identifier",
//       "name": "RegExp"
//     },
//     "arguments": [
//       {
//         "type": "Literal",
//         "raw": "'\"hello\"'",
//         "value": "\"hello\""
//       }
//     ]
//   }
const newRegExpPattern: TreeNode = {
  type: 'NewExpression',
  callee: {
    type: 'Identifier',
    name: 'RegExp'
  },
  arguments: MatchTree.tag('constructorArgs')
};

interface INewRegExpPatternCaptures {
  constructorArgs?: TSESTree.Expression[];
}

type MessageIds = 'error-unsafe-regexp';
type Options = [];

const noUnsafeRegExp: TSESLint.RuleModule<MessageIds, Options> = {
  meta: {
    type: 'problem',
    messages: {
      'error-unsafe-regexp':
        'Regular expressions should be constructed from string constants. Dynamically building strings' +
        ' at runtime may introduce security vulnerabilities, performance concerns, and bugs involving' +
        ' incorrect escaping of special characters.'
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false
      }
    ],
    docs: {
      description:
        'Requires regular expressions to be constructed from string constants rather than dynamically' +
        ' building strings at runtime.',
      category: 'Best Practices',
      recommended: 'warn',
      url: 'https://www.npmjs.com/package/@rushstack/eslint-plugin-security'
    }
  },

  create: (context: TSESLint.RuleContext<MessageIds, Options>) => {
    return {
      NewExpression: (node: TSESTree.NewExpression): void => {
        const captures: INewRegExpPatternCaptures = {};
        if (MatchTree.match(node, newRegExpPattern, captures) && captures.constructorArgs) {
          if (
            captures.constructorArgs.length > 0 &&
            captures.constructorArgs[0].type !== AST_NODE_TYPES.Literal
          ) {
            context.report({
              node,
              messageId: 'error-unsafe-regexp'
            });
          }
        }
      }
    };
  }
};

export { noUnsafeRegExp };
