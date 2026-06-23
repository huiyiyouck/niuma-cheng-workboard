/**
 * 统一错误对象工厂。所有解析 / 配置 / 读取错误都收敛成同一形状，
 * 供项目级 diagnostics、跨项目区域降级、诊断抽屉和前端错误摘要统一消费。
 *
 * 固定字段（设计 Tester R1 Review 中风险项）：
 * - code:       机器可判别的错误码，如 config-error / read-error / parse-error
 * - message:    人类可读摘要（中文）
 * - severity:   info | warning | error
 * - sourcePath: 关联的文件或配置路径，便于排查；无则 null
 * - rawExcerpt: 解析失败时保留的原文片段，供诊断抽屉展示；无则 null
 */
export const SEVERITY = Object.freeze({
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
});

export function makeError({
  code,
  message,
  severity = SEVERITY.ERROR,
  sourcePath = null,
  rawExcerpt = null,
}) {
  return { code, message, severity, sourcePath, rawExcerpt };
}
