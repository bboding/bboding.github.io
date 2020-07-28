"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(require("commander"));
const gifa_1 = require("./actions/gifa");
commander_1.default.version('1.0');
commander_1.default.command('gifa').action(() => __awaiter(void 0, void 0, void 0, function* () {
    yield gifa_1.gifa();
    process.exit();
}));
commander_1.default.command('gifa-buy-sell-count').action(() => __awaiter(void 0, void 0, void 0, function* () {
    yield gifa_1.gifaBuySellCount();
    process.exit();
}));
commander_1.default.parse(process.argv);
