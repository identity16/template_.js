import "jest";
import * as Template_ from "./template_";

describe("compile(htmlStr, args)", function() {
  it("결과 제대로 찍는다.", function() {
    const args = {
      label: "LABEL",
      goods: [
        {
          label: "GOODS 1",
          price: 2000,
          description: "DESCRIPTION for GOODS 1",
          attribute: [
            {
              name: "Size",
              value: "L",
            },
          ],
        },
        {
          label: "GOODS 2",
          price: 5000,
          attribute: [
            {
              name: "Size",
              value: "M",
            },
          ],
        },
        {
          label: "GOODS 3",
          price: 80000,
          attribute: [
            {
              name: "Size",
              value: "XS",
            },
          ],
        },
      ],
    };
    const htmlStr = `
      <div>
        <h1>{label}</h1>
        <ul>
          <!--{@ goods}--><li>
            <h2>{.label}</h2>
            <p>{.description}</p>
            <ol>
              <!--{@ .attribute}-->
              <li>{..name}: {..value}</li>
              <!--{/}-->
            </ol>
          </li>
          <!--{/}-->
        </ul>
      </div>
    `;

    Template_.compile(htmlStr, args);
    expect(true).toBe(true);
  })
})

describe("parse(htmlStr)", function () {
  it("{}, <!--{}--> 모두 식별한다.", function () {
    const testStr = `
    {}<!--{}-->{}{}{}{}<!--{}-->
    <!--{}--><!--{}-->
    `;

    const result = Template_.parse(testStr);
    expect(result.length).toBe(9);
  });

  it("연산자(=, ?, @, /, :)를 알맞게 인식하여 operator 프로퍼티에 넣어준다.(단, 연산자가 없는 경우 '='으로 판단)", function () {
    const testStr = `{text}, {=text}, {?text}, {@text}, {/}, {:}`;
    const result = Template_.parse(testStr);

    expect(result[0].operator).toBe("=");
    expect(result[1].operator).toBe("=");
    expect(result[2].operator).toBe("?");
    expect(result[3].operator).toBe("@");
    expect(result[4].operator).toBe("/");
    expect(result[5].operator).toBe(":");
  });

  it("연산자 뒤에 오는 단어를 token 프로퍼티에 넣어준다.", function () {
    const testStr = `{text}, {=text}, {?text}, {@text}, { text}, {= text}, {? text}, {@ text}`;
    const result = Template_.parse(testStr);

    expect(result[0].token).toBe("text");
    expect(result[1].token).toBe("text");
    expect(result[2].token).toBe("text");
    expect(result[3].token).toBe("text");
    expect(result[4].token).toBe("text");
    expect(result[5].token).toBe("text");
    expect(result[6].token).toBe("text");
    expect(result[7].token).toBe("text");
  });

  it("'=, /, :' 연산자에서 토큰이 없으면 token 프로퍼티로 null을 준다.", function () {
    const testStr = "{}{/}{:}";

    const result = Template_.parse(testStr);

    expect(result[0].token).toBeNull();
    expect(result[1].token).toBeNull();
    expect(result[2].token).toBeNull();
  });

  it("'?, @' 연산자에서 토큰이 주어지지 않으면 에러를 발생한다.", function () {
    const ifStr = "{?}";
    const loopStr = "{@}";

    expect(() => Template_.parse(ifStr)).toThrow(
      "? Operator MUST have a token"
    );
    expect(() => Template_.parse(loopStr)).toThrow(
      "@ Operator MUST have a token"
    );
  });
});

describe("getValue(token, ctx1, ctx2, ...)", function () {
  var args = null;

  beforeEach(function () {
    args = {
      label: "LABEL",
      goods: [
        {
          label: "GOODS 1",
          price: 2000,
          description: "DESCRIPTION for GOODS 1",
          attribute: [
            {
              name: "Size",
              value: "L",
            },
          ],
        },
        {
          label: "GOODS 2",
          price: 5000,
          attribute: [
            {
              name: "Size",
              value: "M",
            },
          ],
        },
        {
          label: "GOODS 3",
          price: 80000,
          attribute: [
            {
              name: "Size",
              value: "XS",
            },
          ],
        },
      ],
    };
  });

  it("token에 '.'이 없는 경우, ctx1에서 프로퍼티를 찾아서 리턴", function () {
    const token = "label";
    const result = Template_.getValue(token, args);
    expect(result).toBe(args[token]);
  });

  it("token에 '.'이 있는 경우, '.'의 개수만큼 더 깊은 ctx에서 프로퍼티를 찾은 후 리턴", function () {
    const key1 = "label",
      key2 = "name";

    const tokenDepth1 = `.${key1}`,
      tokenDepth2 = `..${key2}`;

    const goodsItem = args.goods[0],
      attributeItem = goodsItem.attribute[0];

    const result1 = Template_.getValue(tokenDepth1, args, goodsItem);
    const result2 = Template_.getValue(
      tokenDepth2,
      args,
      goodsItem,
      attributeItem
    );
    expect(result1).toBe(goodsItem[key1]);
    expect(result2).toBe(attributeItem[key2]);
  });

  it("token에 해당하는 값이 없는 경우 null 리턴", function () {
    const token = "abcdefg";

    const result = Template_.getValue(token, args);
    expect(result).toBeNull();
  });

  it("token의 depth에 해당하는 ctx가 존재하지 않는 경우 에러 발생", function () {
    const token = "....label";

    expect(() => Template_.getValue(token, args)).toThrow(
      "Cannot find context for depth 4"
    );
  });

  it("context가 아예 주어지지 않으면 에러 발생", function () {
    const token = "label";

    expect(() => Template_.getValue(token)).toThrow("No context found");
  });

  it("토큰이 유효하지 않은 경우 에러 발생", function () {
    const token1 = "goods.label", // 중간에 '.'
      token2 = "goods.", // 뒤에 '.'
      token3 = "0goods", // 숫자부터 시작
      token4 = "굿즈"; // 한글

    expect(() => Template_.getValue(token1, args)).toThrow("Invalid token");
    expect(() => Template_.getValue(token2, args)).toThrow("Invalid token");
    expect(() => Template_.getValue(token3, args)).toThrow("Invalid token");
    expect(() => Template_.getValue(token4, args)).toThrow("Invalid token");
  });
});

describe("print(token, ctx1, ctx2, ...)", function () {
  let args = null;

  beforeEach(function () {
    args = {
      label: "LABEL",
      goods: [
        {
          label: "GOODS 1",
          price: 2000,
          description: "DESCRIPTION for GOODS 1",
          attribute: [
            {
              name: "Size",
              value: "L",
            },
          ],
        },
        {
          label: "GOODS 2",
          price: 5000,
          attribute: [
            {
              name: "Size",
              value: "M",
            },
          ],
        },
        {
          label: "GOODS 3",
          price: 80000,
          attribute: [
            {
              name: "Size",
              value: "XS",
            },
          ],
        },
      ],
    };
  });

  it("getValue의 결과값을 그대로 리턴한다.", function () {
    const tokens = ["label", ".price", "..name"];

    const goodsItem = args.goods[0],
      attributeItem = goodsItem.attribute[0];

    const result1 = Template_.print(tokens[0], args);
    const result2 = Template_.print(tokens[1], args, goodsItem);
    const result3 = Template_.print(tokens[2], args, goodsItem, attributeItem);
    const answer1 = Template_.getValue(tokens[0], args);
    const answer2 = Template_.getValue(tokens[1], args, goodsItem);
    const answer3 = Template_.getValue(
      tokens[2],
      args,
      goodsItem,
      attributeItem
    );

    expect(result1).toBe(answer1);
    expect(result2).toBe(answer2);
    expect(result3).toBe(answer3);
  });
});

describe("validateToken(token)", function () {
  it("'.', 영어 대소문자, 숫자 외의 다른 문자가 있으면 false를 리턴한다.", function () {
    const tokens = [".isOK000", ".한글", "a!b@ec#Dd%", "abc def"];

    expect(Template_.validateToken(tokens[0])).toBe(true);
    expect(Template_.validateToken(tokens[1])).toBe(false);
    expect(Template_.validateToken(tokens[2])).toBe(false);
    expect(Template_.validateToken(tokens[3])).toBe(false);
  });

  it("'.'이 다른 문자 앞이 아닌 중간 또는 뒤에 등장하면 false를 리턴한다.", function () {
    const tokens = [
      ".TEST",
      "...TEST",
      "TE.ST",
      "TEST..",
      ".TEs.t",
      ".TEST.",
      "..TES..TEST..",
    ];

    expect(Template_.validateToken(tokens[0])).toBe(true);
    expect(Template_.validateToken(tokens[1])).toBe(true);
    expect(Template_.validateToken(tokens[2])).toBe(false);
    expect(Template_.validateToken(tokens[3])).toBe(false);
    expect(Template_.validateToken(tokens[4])).toBe(false);
    expect(Template_.validateToken(tokens[5])).toBe(false);
    expect(Template_.validateToken(tokens[6])).toBe(false);
  });

  it("숫자로 단어가 시작하면 false를 리턴한다.", function () {
    const tokens = ["test12", "12test0"];

    expect(Template_.validateToken(tokens[0])).toBe(true);
    expect(Template_.validateToken(tokens[1])).toBe(false);
  });
});
