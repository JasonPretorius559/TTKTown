import {describe,expect,it} from "vitest";
import {conversationUnread,directConversationId,formatMessageTime,messageDate} from "./messaging";

describe("messaging helpers",()=>{
  it("creates the same direct id regardless of member order",()=>{
    expect(directConversationId("b","a")).toBe("direct_a_b");
    expect(directConversationId("a","b")).toBe("direct_a_b");
  });

  it("normalises Firestore-like timestamps",()=>{
    expect(messageDate({seconds:10})?.toISOString()).toBe("1970-01-01T00:00:10.000Z");
  });

  it("marks only newer messages from another member as unread",()=>{
    const conversation={id:"c",memberIds:["a","b"],lastMessageId:"m",lastSenderId:"b",lastMessageAt:{seconds:20},lastReadAt:{a:{seconds:10}}};
    expect(conversationUnread(conversation,"a")).toBe(true);
    expect(conversationUnread({...conversation,lastSenderId:"a"},"a")).toBe(false);
    expect(conversationUnread({...conversation,lastReadAt:{a:{seconds:30}}},"a")).toBe(false);
  });

  it("uses a compact time for messages from today",()=>{
    expect(formatMessageTime(new Date("2026-09-13T10:30:00Z"),new Date("2026-09-13T18:00:00Z"))).toMatch(/^\d{2}:\d{2}$/);
  });
});
