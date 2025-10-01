# TON Node Hardening Checklist

Track the security posture of TON node hosts. Complete the checklist for each deployment and attach logs or evidence links.

- [ ] OS patched to latest stable release
- [ ] Unused services disabled (`sshd`, `ufw`, etc. reviewed)
- [ ] Firewall rules enforced (ingress limited to required ports)
- [ ] Automatic security updates enabled
- [ ] SSH access restricted to hardware keys
- [ ] Fail2ban or equivalent intrusion detection configured
- [ ] Secrets rotated and stored in vault

Record supporting details below:

```
Host: <hostname>
Deployment date: YYYY-MM-DD
Auditor: <name>
Notes:
- ...
```
