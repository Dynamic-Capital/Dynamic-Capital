import "@stdlib";
import "@stdlib/jetton";

const OP_DEPOSIT: Int = 0x504f4f4c; // 'POOL'
const OP_SCHEDULE_PAUSE: Int = 0x50414c31; // 'PAL1'
const OP_EXECUTE_PAUSE: Int = 0x50414c32; // 'PAL2'
const OP_SCHEDULE_ROUTER: Int = 0x50524f31; // 'PRO1'
const OP_EXECUTE_ROUTER: Int = 0x50524f32; // 'PRO2'
const OP_SCHEDULE_TREASURY: Int = 0x50545231; // 'PTR1'
const OP_EXECUTE_TREASURY: Int = 0x50545232; // 'PTR2'

struct TimelockAction {
  executeAfter: Int;
  addressValue: Address;
}

struct PauseAction {
  executeAfter: Int;
  targetPaused: Bool;
}

struct DepositEvent {
  depositId: Int;
  investorKey: Slice;
  usdtAmount: Int;
  dctAmount: Int;
  fxRate: Int;
  tonTxHash: Slice;
  timestamp: Int;
}

contract TonPoolAllocator {
  admin: Address;
  treasury: Address;
  dexRouter: Address;
  usdtJetton: Address;
  dctMaster: Address;
  paused: Bool;
  timelockSeconds: Int;
  pendingPause?: PauseAction;
  pendingRouter?: TimelockAction;
  pendingTreasury?: TimelockAction;

  init(
    admin: Address,
    treasury: Address,
    dexRouter: Address,
    usdtJetton: Address,
    dctMaster: Address,
    timelockHours: Int,
  ) {
    self.admin = admin;
    self.treasury = treasury;
    self.dexRouter = dexRouter;
    self.usdtJetton = usdtJetton;
    self.dctMaster = dctMaster;
    self.paused = false;
    self.timelockSeconds = timelockHours * 3600;
  }

  receive(msg: InternalMessage) {
    if (msg.body.beginParse().preloadUint(32) == op::JettonTransfer) {
      self.handleJettonTransfer(msg);
      return;
    }

    if (msg.info.src != self.admin) {
      self.reject(msg, "allocator: unauthorized");
      return;
    }

    slice body = msg.body.beginParse();
    Int op = body.loadUint(32);

    if (op == OP_SCHEDULE_PAUSE) {
      Bool target = body.loadBit();
      self.pendingPause = PauseAction{
        executeAfter: now() + self.timelockSeconds,
        targetPaused: target,
      };
      return;
    }

    if (op == OP_EXECUTE_PAUSE) {
      self.paused = self.requirePause(self.pendingPause);
      self.pendingPause = null();
      return;
    }

    if (op == OP_SCHEDULE_ROUTER) {
      Address next = body.loadMsgAddress();
      self.pendingRouter = TimelockAction{
        executeAfter: now() + self.timelockSeconds,
        addressValue: next,
      };
      return;
    }

    if (op == OP_EXECUTE_ROUTER) {
      self.dexRouter = self.requirePending(self.pendingRouter);
      self.pendingRouter = null();
      return;
    }

    if (op == OP_SCHEDULE_TREASURY) {
      Address nextTreasury = body.loadMsgAddress();
      self.pendingTreasury = TimelockAction{
        executeAfter: now() + self.timelockSeconds,
        addressValue: nextTreasury,
      };
      return;
    }

    if (op == OP_EXECUTE_TREASURY) {
      self.treasury = self.requirePending(self.pendingTreasury);
      self.pendingTreasury = null();
      return;
    }
  }

  fun handleJettonTransfer(msg: InternalMessage) {
    require(!self.paused, "allocator paused");
    if (msg.info.src != self.usdtJetton) {
      self.reject(msg, "allocator: unauthorized jetton");
      return;
    }

    slice body = msg.body.beginParse();
    Int op = body.loadUint(32);
    if (op != op::JettonTransfer) {
      self.reject(msg, "allocator: invalid jetton payload");
      return;
    }

    body.loadUint(64); // query id
    Int jettonAmount = body.loadCoins();
    body.loadMsgAddress(); // destination
    body.loadMsgAddress(); // response destination
    body.loadMaybeRef(); // skip custom payload
    Int forwardTonAmount = body.loadCoins();
    require(msg.info.value - msg.info.fwdFee >= forwardTonAmount, "allocator: insufficient ton");

    cell forwardPayloadCell = body.loadEitherRef();
    slice forwardPayload = forwardPayloadCell.beginParse();

    Int forwardOp = forwardPayload.loadUint(32);
    if (forwardOp != OP_DEPOSIT) {
      self.reject(msg, "allocator: unsupported op");
      return;
    }

    Int depositId = forwardPayload.loadUint(64);
    Slice investorKey = forwardPayload.loadBitsSlice(256);
    Int usdtAmount = forwardPayload.loadCoins();
    require(usdtAmount == jettonAmount, "allocator: amount mismatch");
    Int dctAmount = forwardPayload.loadCoins();
    require(dctAmount > 0, "allocator: invalid dct amount");
    Int expectedFx = forwardPayload.loadUint(64);
    Slice tonTx = forwardPayload.loadBitsSlice(256);

    sendRawMessage(
      InternalMessage{
        info: InternalMessageInfo{
          src: myAddress(),
          dest: self.dexRouter,
          value: forwardTonAmount,
          ihrDisabled: true,
        },
        body: forwardPayloadCell,
      },
    );

    DepositEvent event = DepositEvent{
      depositId: depositId,
      investorKey: investorKey,
      usdtAmount: usdtAmount,
      dctAmount: dctAmount,
      fxRate: expectedFx,
      tonTxHash: tonTx,
      timestamp: now(),
    };
    emit(event);
  }

  fun requirePending(pending?: TimelockAction): Address {
    require(pending != null(), "allocator: nothing scheduled");
    require(now() >= pending?.executeAfter, "allocator: timelock");
    require(pending?.addressValue != null(), "allocator: invalid address");
    return pending?.addressValue as Address;
  }

  fun requirePause(pending?: PauseAction): Bool {
    require(pending != null(), "allocator: nothing scheduled");
    require(now() >= pending?.executeAfter, "allocator: timelock");
    return pending?.targetPaused as Bool;
  }

  fun reject(msg: InternalMessage, err: String) {
    sendRawMessage(
      InternalMessage{
        info: InternalMessageInfo{
          src: myAddress(),
          dest: msg.info.src,
          value: msg.info.value - msg.info.fwdFee,
          ihrDisabled: true,
        },
        body: beginCell().storeUint(op::transfer_notification, 32).storeString(err).endCell(),
      },
    );
  }
}
