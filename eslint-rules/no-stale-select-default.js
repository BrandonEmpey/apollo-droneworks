/**
 * no-stale-select-default
 *
 * Catches `defaultValue={field.value}` on JSX elements inside react-hook-form
 * <FormField render={...}> render props and auto-fixes them to `value={field.value}`.
 *
 * Bad  – value goes stale after re-renders:
 *   <Select defaultValue={field.value} onValueChange={field.onChange}>
 *
 * Good – stays in sync with form state:
 *   <Select value={field.value} onValueChange={field.onChange}>
 */

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow `defaultValue={field.value}` inside react-hook-form FormField render props. Use `value={field.value}` instead.",
    },
    fixable: "code",
    schema: [],
    messages: {
      staleDefault:
        "Avoid `defaultValue={field.value}` inside a FormField render prop — it makes the dropdown stale after re-renders. " +
        "Use `value={field.value}` instead.",
    },
  },

  create(context) {
    function isInsideFormFieldRenderProp(node) {
      let current = node.parent;
      while (current) {
        if (
          (current.type === "ArrowFunctionExpression" ||
            current.type === "FunctionExpression") &&
          current.parent?.type === "JSXExpressionContainer" &&
          current.parent.parent?.type === "JSXAttribute" &&
          current.parent.parent.name?.name === "render" &&
          current.parent.parent.parent?.type === "JSXOpeningElement" &&
          current.parent.parent.parent.name?.name === "FormField"
        ) {
          return true;
        }
        current = current.parent;
      }
      return false;
    }

    return {
      JSXAttribute(node) {
        if (
          node.name.type !== "JSXIdentifier" ||
          node.name.name !== "defaultValue"
        ) {
          return;
        }

        if (!node.value || node.value.type !== "JSXExpressionContainer") {
          return;
        }

        const expr = node.value.expression;

        if (
          expr.type !== "MemberExpression" ||
          expr.object.type !== "Identifier" ||
          expr.object.name !== "field" ||
          expr.property.type !== "Identifier" ||
          expr.property.name !== "value"
        ) {
          return;
        }

        if (!isInsideFormFieldRenderProp(node)) {
          return;
        }

        context.report({
          node,
          messageId: "staleDefault",
          fix(fixer) {
            return fixer.replaceText(node.name, "value");
          },
        });
      },
    };
  },
};
