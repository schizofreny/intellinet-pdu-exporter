import envalid, { port, str } from "envalid"

const config = envalid.cleanEnv(
  process.env,
  {
    PORT: port({ default: 9987 }),
    PDU_IP: str({ default: "192.168.88.249" }),
    PDU_STATS_PATH: str({ default: "/status.xml" })
  },
  {
    strict: true
  }
)

export default config
