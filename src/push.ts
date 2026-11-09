// Expo Push Service: https://docs.expo.dev/push-notifications/sending-notifications/
export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default";
  channelId?: string;
};
export type PushTicket = { status: "ok"; id: string } | { status: "error"; message: string; details?: { error?: string } };

export const isExpoPushToken = (t: unknown): t is string =>
  typeof t === "string" && /^Expo(nent)?PushToken\[[^\]]+\]$/.test(t);

// 100건씩 나눠 보내고, 보낸 순서대로 티켓을 돌려줌. 요청 자체가 실패한 묶음은 error 티켓으로 채움.
// ponytail: 영수증(getReceipts) 확인은 생략. 티켓 단계의 DeviceNotRegistered만 처리하고, 이탈 기기가 쌓이면 receipts 조회 추가.
export async function sendPush(messages: PushMessage[], accessToken?: string): Promise<PushTicket[]> {
  const tickets: PushTicket[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      const message = `Expo push ${res.status}: ${await res.text()}`;
      console.error(message);
      tickets.push(...chunk.map(() => ({ status: "error" as const, message })));
      continue;
    }
    tickets.push(...((await res.json()) as { data: PushTicket[] }).data);
  }
  return tickets;
}
