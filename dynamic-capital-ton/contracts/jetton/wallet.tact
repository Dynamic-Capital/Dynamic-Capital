import "@stdlib";
import "@stdlib/jetton";

contract DynamicCapitalWallet with JettonWallet {
  init(master: Address, owner: Address, content: Cell) {
    self.masterAddress = master;
    self.ownerAddress = owner;
    self.walletContent = content;
  }

  receive(msg: InternalMessage) {
    self.onInternalMessage(msg);
  }

  external fun burn(amount: Int, responseDestination: Address?) {
    self.sendBurn(amount, responseDestination, null());
  }
}
