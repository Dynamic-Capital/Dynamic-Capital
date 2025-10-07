import "@stdlib";

const OP_EXECUTE_DNS_UPDATE: Int = 0x444e5331; // 'DNS1'
const OP_EVENT_DNS_UPDATE: Int = 0x444e5345; // 'DNSE'

const MIN_FORWARD_VALUE: Int = 10000000; // 0.01 TON in nanotons
const STORAGE_RESERVE: Int = 5000000; // 0.005 TON kept on the controller for rent

struct DnsUpdateEvent {
  op: Int;
  executor: Address;
  record: Slice;
  forwardedValue: Int;
  quorumPercent: Int;
  timestamp: Int;
}

contract DaoDnsController {
  daoMultisig: Address;
  treasuryWallet: Address;
  quorum: Int;

  init(dao: Address, treasury: Address, quorumPct: Int) {
    self.requireBaseWorkchain(dao, "dns-controller: dao workchain");
    self.requireBaseWorkchain(treasury, "dns-controller: treasury workchain");
    require(quorumPct > 0 && quorumPct <= 100, "dns-controller: quorum range");
    self.daoMultisig = dao;
    self.treasuryWallet = treasury;
    self.quorum = quorumPct;
  }

  receive(msg: InternalMessage) {
    if (msg.info.bounced) {
      return;
    }

    if (msg.body == null() || msg.body.bits() < 32) {
      return;
    }

    slice body = msg.body.beginParse();
    Int op = body.loadUint(32);

    if (op == OP_EXECUTE_DNS_UPDATE) {
      if (msg.info.src != self.daoMultisig) {
        self.reject(msg, "dns-controller: unauthorized");
        return;
      }

      self.handleDnsUpdate(msg, body);
      return;
    }

    if (msg.info.src != self.daoMultisig) {
      self.reject(msg, "dns-controller: unauthorized");
      return;
    }

    self.reject(msg, "dns-controller: unknown op");
  }

  fun handleDnsUpdate(msg: InternalMessage, body: slice) {
    self.requireDao(msg.info.src);

    require(body.refs() > 0, "dns-controller: missing record");
    Cell recordCell = body.loadRef();
    Slice recordSlice = recordCell.beginParse();

    require(recordSlice.bits() > 0 || recordSlice.refs() > 0, "dns-controller: empty record");
    require(body.bits() == 0 && body.refs() == 0, "dns-controller: trailing data");

    Int availableValue = msg.info.value - msg.info.fwdFee;
    require(availableValue >= MIN_FORWARD_VALUE + STORAGE_RESERVE, "dns-controller: insufficient value");
    Int forwardValue = availableValue - STORAGE_RESERVE;

    sendRawMessage(
      InternalMessage{
        info: InternalMessageInfo{
          src: myAddress(),
          dest: self.treasuryWallet,
          value: forwardValue,
          ihrDisabled: true,
        },
        body: recordCell,
      },
    );

    DnsUpdateEvent event = DnsUpdateEvent{
      op: OP_EVENT_DNS_UPDATE,
      executor: msg.info.src,
      record: recordSlice,
      forwardedValue: forwardValue,
      quorumPercent: self.quorum,
      timestamp: now(),
    };
    emit(event);
  }

  fun requireDao(sender: Address) {
    require(sender == self.daoMultisig, "dns-controller: unauthorized");
  }

  fun reject(msg: InternalMessage, err: String) {
    Int bounceValue = msg.info.value - msg.info.fwdFee;
    if (bounceValue <= 0) {
      return;
    }

    sendRawMessage(
      InternalMessage{
        info: InternalMessageInfo{
          src: myAddress(),
          dest: msg.info.src,
          value: bounceValue,
          ihrDisabled: true,
        },
        body: beginCell().storeString(err).endCell(),
      },
    );
  }

  fun requireBaseWorkchain(addr: Address, err: String) {
    StdAddress components = parseStdAddress(addr.asSlice());
    require(components.workchain == 0, err);
  }

  get fun get_config(): (Address, Address, Int) {
    return (self.daoMultisig, self.treasuryWallet, self.quorum);
  }
}
