"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BookingFlow = BookingFlow;
var _react = _interopRequireWildcard(require("react"));
var _schedJs = _interopRequireDefault(require("@scheddev/sched-js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != _typeof(e) && "function" != typeof e) return { "default": e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n["default"] = e, t && t.set(e, n), n; }
function BookingFlow(_ref) {
  var clientId = _ref.clientId,
    resourceId = _ref.resourceId,
    resourceGroupId = _ref.resourceGroupId,
    _ref$environment = _ref.environment,
    environment = _ref$environment === void 0 ? "production" : _ref$environment,
    _ref$demoMode = _ref.demoMode,
    demoMode = _ref$demoMode === void 0 ? false : _ref$demoMode;
  (0, _react.useEffect)(function () {
    var sched = new _schedJs["default"]();
    window.instance = sched;
    if (!clientId || !resourceId && !resourceGroupId) {
      console.error("Missing clientId or resourceId/resourceGroupId");
      return;
    }
    sched.init("sc-calendar-container", clientId, {
      resourceId: resourceId,
      resourceGroupId: resourceGroupId,
      environment: environment,
      demoMode: demoMode
    });
  }, [clientId, resourceId, resourceGroupId, environment, demoMode]);
  return /*#__PURE__*/_react["default"].createElement("div", {
    id: "sc-calendar-container"
  });
}