import "@stdlib";
import "@stdlib/jetton";

const MAX_SUPPLY: Int = 100000000000000000;
const BPS_DENOMINATOR: Int = 10000;
const MAX_TAX_BPS: Int = 100;

const OP_CLOSE_GENESIS: Int = 0x44435401;
const OP_SCHEDULE_PAUSE: Int = 0x44435402;
const OP_EXECUTE_PAUSE: Int = 0x44435403;
const OP_SCHEDULE_TAX: Int = 0x44435404;
const OP_EXECUTE_TAX: Int = 0x44435405;
const OP_SCHEDULE_TREASURY: Int = 0x44435406;
const OP_EXECUTE_TREASURY: Int = 0x44435407;
const OP_SCHEDULE_ROUTER: Int = 0x44435408;
const OP_EXECUTE_ROUTER: Int = 0x44435409;

struct TimelockPayload {
  executeAfter: Int;
  boolValue: Bool;
  intValue: Int;
  addressValue: Address;
}

enum TimelockKind {
  None = 0,
  Pause = 1,
  Tax = 2,
  Treasury = 3,
  Router = 4,
}

contract DynamicCapitalMaster with JettonMaster {
  admin: Address;
  genesisClosed: Bool;
  maxSupply: Int;
  transferTaxBps: Int;
  treasury: Address;
  dexRouter: Address;
  transfersPaused: Bool;
  timelockSeconds: Int;
  pendingPause?: TimelockPayload;
  pendingTax?: TimelockPayload;
  pendingTreasury?: TimelockPayload;
  pendingRouter?: TimelockPayload;

  init(admin: Address, content: Cell, walletCode: Cell, treasury: Address, dexRouter: Address, timelockHours: Int) {
    self.requireBaseWorkchain(admin, "master: admin workchain");
    self.requireBaseWorkchain(treasury, "master: treasury workchain");
    self.requireBaseWorkchain(dexRouter, "master: router workchain");
    self.admin = admin;
    self.jettonContent = content;
    self.jettonWalletCode = walletCode;
    self.maxSupply = MAX_SUPPLY;
    self.totalSupply = 0;
    self.genesisClosed = false;
    self.transferTaxBps = 0;
    self.treasury = treasury;
    self.dexRouter = dexRouter;
    self.transfersPaused = false;
    self.timelockSeconds = timelockHours * 3600;
  }

  get fun totalSupply(): Int {
    return self.totalSupply;
  }

  get fun maxSupply(): Int {
    return self.maxSupply;
  }

  receive(msg: InternalMessage) {
    if (msg.info.src != self.admin) {
      self.onInternalMessage(msg);
      return;
    }

    if (msg.body.beginParse().preloadUint(32) == op::JettonMint) {
      self.handleAdminMint(msg);
      return;
    }

    slice sc = msg.body.beginParse();
    Int op = sc.loadUint(32);

    if (op == OP_CLOSE_GENESIS) {
      self.requireAdmin(msg.info.src);
      self.genesisClosed = true;
      return;
    }

    if (op == OP_SCHEDULE_PAUSE) {
      self.requireAdmin(msg.info.src);
      Bool target = sc.loadBit();
      self.pendingPause = TimelockPayload{ executeAfter: now() + self.timelockSeconds, boolValue: target, intValue: 0, addressValue: null() };
      return;
    }

    if (op == OP_EXECUTE_PAUSE) {
      self.requireAdmin(msg.info.src);
      self.applyTimelock(self.pendingPause, TimelockKind::Pause);
      return;
    }

    if (op == OP_SCHEDULE_TAX) {
      self.requireAdmin(msg.info.src);
      Int taxBps = sc.loadUint(16);
      require(taxBps >= 0 && taxBps <= MAX_TAX_BPS, "tax range");
      self.pendingTax = TimelockPayload{ executeAfter: now() + self.timelockSeconds, boolValue: false, intValue: taxBps, addressValue: null() };
      return;
    }

    if (op == OP_EXECUTE_TAX) {
      self.requireAdmin(msg.info.src);
      self.applyTimelock(self.pendingTax, TimelockKind::Tax);
      return;
    }

    if (op == OP_SCHEDULE_TREASURY) {
      self.requireAdmin(msg.info.src);
      Address newTreasury = sc.loadMsgAddress();
      self.requireBaseWorkchain(newTreasury, "master: treasury workchain");
      self.pendingTreasury = TimelockPayload{ executeAfter: now() + self.timelockSeconds, boolValue: false, intValue: 0, addressValue: newTreasury };
      return;
    }

    if (op == OP_EXECUTE_TREASURY) {
      self.requireAdmin(msg.info.src);
      self.applyTimelock(self.pendingTreasury, TimelockKind::Treasury);
      return;
    }

    if (op == OP_SCHEDULE_ROUTER) {
      self.requireAdmin(msg.info.src);
      Address newRouter = sc.loadMsgAddress();
      self.requireBaseWorkchain(newRouter, "master: router workchain");
      self.pendingRouter = TimelockPayload{ executeAfter: now() + self.timelockSeconds, boolValue: false, intValue: 0, addressValue: newRouter };
      return;
    }

    if (op == OP_EXECUTE_ROUTER) {
      self.requireAdmin(msg.info.src);
      self.applyTimelock(self.pendingRouter, TimelockKind::Router);
      return;
    }

    self.onInternalMessage(msg);
  }

  fun handleAdminMint(msg: InternalMessage) {
    require(!self.genesisClosed, "genesis closed");
    slice body = msg.body.beginParse();
    body.loadUint(32); // op
    body.loadUint(64); // query id
    Int amount = body.loadCoins();
    require(self.totalSupply + amount <= self.maxSupply, "max supply");
    self.totalSupply += amount;
    self.onInternalMessage(msg);
  }

  override fun onTransfer(from: Address, to: Address, amount: Int, responseAddress: Address?, forwardPayload: Slice, customPayload: Cell?) {
    require(!self.transfersPaused, "paused");
    Int tax = (amount * self.transferTaxBps) / BPS_DENOMINATOR;
    Int sendAmount = amount - tax;
    super.onTransfer(from, to, sendAmount, responseAddress, forwardPayload, customPayload);
    if (tax > 0 && self.treasury != null()) {
      self.internalTransfer(from, self.treasury, tax, responseAddress, emptySlice(), null());
    }
  }

  override fun onBurn(from: Address, amount: Int) {
    super.onBurn(from, amount);
    self.totalSupply -= amount;
  }

  fun applyTimelock(pending: TimelockPayload?, kind: TimelockKind) {
    require(pending != null, "no pending");
    TimelockPayload payload = pending!!;
    require(now() >= payload.executeAfter, "timelock");

    if (kind == TimelockKind::Pause) {
      self.transfersPaused = payload.boolValue;
      self.pendingPause = null;
      return;
    }

    if (kind == TimelockKind::Tax) {
      self.transferTaxBps = payload.intValue;
      self.pendingTax = null;
      return;
    }

    if (kind == TimelockKind::Treasury) {
      self.requireBaseWorkchain(payload.addressValue, "master: treasury workchain");
      self.treasury = payload.addressValue;
      self.pendingTreasury = null;
      return;
    }

    if (kind == TimelockKind::Router) {
      self.requireBaseWorkchain(payload.addressValue, "master: router workchain");
      self.dexRouter = payload.addressValue;
      self.pendingRouter = null;
      return;
    }
  }

  fun requireAdmin(addr: Address) {
    require(addr == self.admin, "not admin");
  }

  fun requireBaseWorkchain(addr: Address, err: String) {
    StdAddress components = parseStdAddress(addr.asSlice());
    require(components.workchain == 0, err);
  }
}
