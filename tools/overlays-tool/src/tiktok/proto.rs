//! The few TikTok Webcast protobuf messages the app needs, with only the fields it reads.
//! Field numbers follow tiktok-live-proto v3 (the schema tiktok-live-connector 2.x uses); unknown fields are skipped.

use prost::Message;

/// One WebSocket frame.
#[derive(Clone, PartialEq, Message)]
pub struct PushFrame {
    #[prost(int64, tag = "1")]
    pub seq_id: i64,
    #[prost(int64, tag = "2")]
    pub log_id: i64,
    #[prost(int64, tag = "3")]
    pub service: i64,
    #[prost(int64, tag = "4")]
    pub method: i64,
    #[prost(string, tag = "6")]
    pub payload_encoding: String,
    #[prost(string, tag = "7")]
    pub payload_type: String,
    #[prost(bytes = "vec", tag = "8")]
    pub payload: Vec<u8>,
}

/// A batch of room messages (the payload of a "msg" frame, and the sign server's first response).
#[derive(Clone, PartialEq, Message)]
pub struct FetchResult {
    #[prost(message, repeated, tag = "1")]
    pub messages: Vec<BaseMessage>,
    #[prost(string, tag = "2")]
    pub cursor: String,
    #[prost(string, tag = "5")]
    pub internal_ext: String,
    #[prost(map = "string, string", tag = "7")]
    pub route_params: std::collections::HashMap<String, String>,
    #[prost(bool, tag = "9")]
    pub need_ack: bool,
    #[prost(string, tag = "10")]
    pub push_server: String,
}

#[derive(Clone, PartialEq, Message)]
pub struct BaseMessage {
    #[prost(string, tag = "1")]
    pub method: String,
    #[prost(bytes = "vec", tag = "2")]
    pub payload: Vec<u8>,
    #[prost(int64, tag = "3")]
    pub msg_id: i64,
}

#[derive(Clone, PartialEq, Message)]
pub struct HeartBeat {
    #[prost(int64, tag = "1")]
    pub room_id: i64,
    #[prost(int64, tag = "2")]
    pub send_packet_seq_id: i64,
}

#[derive(Clone, PartialEq, Message)]
pub struct EnterRoom {
    #[prost(int64, tag = "1")]
    pub room_id: i64,
    #[prost(string, tag = "2")]
    pub room_tag: String,
    #[prost(string, tag = "3")]
    pub live_region: String,
    #[prost(int64, tag = "4")]
    pub live_id: i64,
    #[prost(string, tag = "5")]
    pub identity: String,
    #[prost(string, tag = "6")]
    pub cursor: String,
    #[prost(int64, tag = "7")]
    pub account_type: i64,
    #[prost(int64, tag = "8")]
    pub enter_unique_id: i64,
    #[prost(string, tag = "9")]
    pub filter_welcome_msg: String,
    #[prost(bool, tag = "10")]
    pub is_anchor_continue_keep_msg: bool,
}

#[derive(Clone, PartialEq, Message)]
pub struct Text {
    #[prost(string, tag = "1")]
    pub key: String,
}

#[derive(Clone, PartialEq, Message)]
pub struct Common {
    #[prost(string, tag = "1")]
    pub method: String,
    #[prost(int64, tag = "2")]
    pub msg_id: i64,
    #[prost(message, optional, tag = "8")]
    pub display_text: Option<Text>,
}

#[derive(Clone, PartialEq, Message)]
pub struct User {
    #[prost(int64, tag = "1")]
    pub id: i64,
    #[prost(string, tag = "3")]
    pub nickname: String,
    /// The @handle.
    #[prost(string, tag = "38")]
    pub display_id: String,
}

#[derive(Clone, PartialEq, Message)]
pub struct ChatMessage {
    #[prost(message, optional, tag = "1")]
    pub common: Option<Common>,
    #[prost(message, optional, tag = "2")]
    pub user: Option<User>,
    #[prost(string, tag = "3")]
    pub content: String,
}

#[derive(Clone, PartialEq, Message)]
pub struct Gift {
    #[prost(int64, tag = "5")]
    pub id: i64,
    /// 1 = a gift that can be sent in a streak (combo).
    #[prost(int32, tag = "11")]
    pub r#type: i32,
    #[prost(int32, tag = "12")]
    pub diamond_count: i32,
    #[prost(string, tag = "16")]
    pub name: String,
}

#[derive(Clone, PartialEq, Message)]
pub struct GiftMessage {
    #[prost(message, optional, tag = "1")]
    pub common: Option<Common>,
    #[prost(int64, tag = "2")]
    pub gift_id: i64,
    #[prost(int32, tag = "5")]
    pub repeat_count: i32,
    #[prost(message, optional, tag = "7")]
    pub user: Option<User>,
    #[prost(int32, tag = "9")]
    pub repeat_end: i32,
    #[prost(message, optional, tag = "15")]
    pub gift: Option<Gift>,
}

#[derive(Clone, PartialEq, Message)]
pub struct SocialMessage {
    #[prost(message, optional, tag = "1")]
    pub common: Option<Common>,
    #[prost(message, optional, tag = "2")]
    pub user: Option<User>,
}

#[derive(Clone, PartialEq, Message)]
pub struct ControlMessage {
    #[prost(message, optional, tag = "1")]
    pub common: Option<Common>,
    /// 3 = stream ended, 4 = stream suspended.
    #[prost(int32, tag = "2")]
    pub action: i32,
}
