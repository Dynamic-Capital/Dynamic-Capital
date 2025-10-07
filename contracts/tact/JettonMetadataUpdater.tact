// JettonMetadataUpdater.tact
// Simple helper to update the metadata URI (content cell) of your Jetton Master.

contract JettonMetadataUpdater {
  address owner;          // Treasury or DAO
  address jettonMaster;   // DCT Master Address

  init(owner: address, jetton: address) {
    this.owner = owner;
    this.jettonMaster = jetton;
  }

  updateMetadata(newUri: string) onlyOwner {
    // convert string -> cell
    let uriCell = beginCell().storeStringTail(newUri).endCell();

    // build message body for Jetton Master
    let msgBody = beginCell()
        .storeUint(0x01, 32)         // op code: set_content
        .storeRef(uriCell)
        .endCell();

    send(this.jettonMaster, 0.1 ton, msgBody);
  }

  modifier onlyOwner() {
    require(msg.sender == this.owner, 100);
  }
}
