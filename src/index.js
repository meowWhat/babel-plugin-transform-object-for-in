// @ts-check
module.exports = ({ types }) => {
  /** @type {import ('@babel/types')} */
  const t = types

  /**
   * 将 continue 转换为 return
   * @param {import ('@babel/types').Statement[]} statements
   */
  const transformContinueToReturn = (statements) => {
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (t.isContinueStatement(statement)) {
        statements[i] = t.returnStatement(t.nullLiteral())
        continue
      }
      // 处理 if 表达式
      if (t.isConditional(statement) && t.isBlockStatement(statement.consequent)) {
        transformContinueToReturn(statement.consequent.body)
      }
      // 处理 for
      if (t.isFor(statement)) {
        continue
      }
      // 处理 switch - case
      if (t.isSwitchStatement(statement)) {
        for (let j = 0; j < statement.cases.length; j++) {
          const caseItem = statement.cases[j]
          transformContinueToReturn(caseItem.consequent)
        }
      }
    }
  }

  return {
    visitor: {
      ForInStatement(path) {
        /** @type {import ('@babel/types').ForInStatement} */
        const node = path.node
        const { left, right } = node
        /**
         * transform express for ..in to Object.keys
         * @example  input:  for (var key in obj) { if(flag) { continue}}
         *           output: Object.keys(obj).forEach(key => { if(flag) { return }})
         */
        if (t.isVariableDeclaration(left) && t.isIdentifier(right) && t.isBlockStatement(node.body)) {
          const keysObject = right
          if (left.declarations.length === 1) {
            const firstDeclarations = left.declarations[0]
            if (t.isVariableDeclarator(firstDeclarations) && t.isIdentifier(firstDeclarations.id)) {
              const key = firstDeclarations.id
              // 将 body 中所有节点的 continue 转换为 return
              transformContinueToReturn(node.body.body)
              // 构建 Object.keys(keysObject).forEach((key)=>{ ... })表达式
              const keys = t.callExpression(t.identifier('Object.keys'), [keysObject])
              const forEach = t.callExpression(t.identifier('forEach'), [
                keys,
                t.arrowFunctionExpression([key], node.body),
              ])
              path.replaceWith(forEach)
            }
          }
        }
      },
    },
  }
}
