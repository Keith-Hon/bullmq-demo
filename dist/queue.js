"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.connection = exports.TASK_QUEUE = void 0;
exports.getQueue = getQueue;

var _dotenv = _interopRequireDefault(require("dotenv"));

var _findUp = _interopRequireDefault(require("find-up"));

var _bullmq = require("bullmq");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_dotenv.default.config({
  path: _findUp.default.sync(".env")
});

const TASK_QUEUE = "task-queue";
exports.TASK_QUEUE = TASK_QUEUE;
const connection = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
}; // Create a new connection in every instance

exports.connection = connection;

function getQueue() {
  return new _bullmq.Queue(TASK_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: 3
    }
  });
}