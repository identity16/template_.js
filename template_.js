export const compile = (htmlStr, args) => {
  const tags = parse(htmlStr);
  const loopStack = [];
  const context = [args];
  let result = "",
    prevCursor = 0;
  let i = 0;
  while (i < tags.length) {
    const tag = tags[i];
    result += htmlStr.substring(prevCursor, tag.range[0]);

    switch (tag.operator) {
      // Print
      case "=":
        result += print(tag.token, ...context);
        prevCursor = tag.range[1] + 1;
        i++;
        break;

      // Loop
      case "@":
        const loopArr = getValue(tag.token, ...context);
        const contentStart = tag.range[1] + 1;

        loopStack.push({
          contentStart,
          cur: 0,
          arr: loopArr,
          tagIdx: i
        });

        context.push(loopArr[0]);
        prevCursor = contentStart;
        i++;
        break;

      // EndLoop
      case "/":
        if (loopStack.length === 0) throw new Error("No Loop Exists");

        const currentLoop = loopStack[loopStack.length - 1];
        currentLoop.cur += 1;

        context.pop();
        if (currentLoop.cur === currentLoop.arr.length) {
          loopStack.pop();
          prevCursor = tag.range[1] + 1;
          i++;
        } else {
          context.push(currentLoop.arr[currentLoop.cur]);
          prevCursor = currentLoop.contentStart;
          i = currentLoop.tagIdx + 1;
        }
        break;
      default:
        throw new Error("Invalid Operator");
    }
  }
  
  result += htmlStr.substring(prevCursor, htmlStr.length);
  
  return result;
};

export const parse = (htmlStr) => {
  const reToken = "\\s*[@=/:\\?]?\\s*[\\w\\.]*\\s*";
  const reSyntax = `<!--{(${reToken})}-->|{(${reToken})}`;
  const regex = new RegExp(reSyntax, "g");

  let searchResult = null;

  const foundTags = [];
  while ((searchResult = regex.exec(htmlStr)) !== null) {
    const tagStr = searchResult[0];
    const identifier =
      typeof searchResult[1] === "string"
        ? searchResult[1].trim()
        : searchResult[2].trim();
    const endIdx = regex.lastIndex - 1;
    const startIdx = endIdx - tagStr.length + 1;

    let operator, token;

    if (identifier.length === 0) {
      operator = "=";
      token = null;
    } else {
      switch (identifier[0]) {
        case "?":
        case "@":
          operator = identifier[0];
          token = identifier.substring(1).trim();
          if (!token) throw new Error(`${operator} Operator MUST have a token`);

          break;
        case "/":
        case ":":
          operator = identifier[0];
          token = null;
          break;
        case "=":
          operator = identifier[0];
          token = identifier.substring(1).trim();
          if (!token) {
            token = null;
          }

          break;
        default:
          operator = "=";
          token = identifier;
      }
    }

    foundTags.push({
      operator,
      token,
      range: [startIdx, endIdx],
    });
  }

  return foundTags;
};

export const getValue = (token, ...ctx) => {
  if (ctx.length === 0) throw new Error("No context found");

  // Validate Token
  if (!validateToken(token)) throw new Error("Invalid token");

  const depth = token.lastIndexOf(".") + 1;
  if (ctx.length < depth)
    throw new Error(`Cannot find context for depth ${depth}`);

  const key = token.substring(depth);
  if (ctx[depth][key]) return ctx[depth][key];
  return null;
};

export const print = (token, ...ctx) => {
  const value = getValue(token, ...ctx);
  return value === null ? "" : value;
};

export const validateToken = (token) => {
  // Validate Token
  const reTokenValidation = /^\.*[a-zA-Z][a-zA-Z0-9]*$/g;
  return reTokenValidation.test(token);
};
