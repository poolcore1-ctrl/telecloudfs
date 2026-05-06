from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from telethon import TelegramClient, Api, functions, types
import uvicorn
import os

# Configuration
API_ID = 123456 # Replace with your API ID
API_HASH = "your_api_hash" # Replace with your API Hash
BOT_TOKEN = "your_bot_token" # The bot MUST be an admin in your folders

app = FastAPI()
client = TelegramClient("bot_session", API_ID, API_HASH)

@app.on_event("startup")
async def startup():
    await client.start(bot_token=BOT_TOKEN)
    print("Bot started and connected to Telegram!")

async def file_generator(channel_id, message_id, access_hash, offset=0, limit=None):
    # 1. Resolve the peer
    peer = types.InputPeerChannel(channel_id=int(channel_id), access_hash=int(access_hash))
    
    # 2. Get fresh file info (and file_reference)
    messages = await client.get_messages(peer, ids=[int(message_id)])
    if not messages or not messages[0].media:
        return

    msg = messages[0]
    media = msg.media
    
    if isinstance(media, types.MessageMediaDocument):
        doc = media.document
        location = types.InputDocumentFileLocation(
            id=doc.id,
            access_hash=doc.access_hash,
            file_reference=doc.file_reference,
            thumb_size=""
        )
        total_size = doc.size
    elif isinstance(media, types.MessageMediaPhoto):
        photo = media.photo
        location = types.InputPhotoFileLocation(
            id=photo.id,
            access_hash=photo.access_hash,
            file_reference=photo.file_reference,
            thumb_size=photo.sizes[-1].type
        )
        total_size = photo.sizes[-1].size
    else:
        return

    # 3. Stream the file in chunks
    chunk_size = 1024 * 1024 # 1MB chunks
    current_offset = offset
    
    while True:
        if limit and current_offset >= limit:
            break
            
        remaining = total_size - current_offset
        if remaining <= 0:
            break
            
        to_read = min(chunk_size, remaining)
        if limit:
            to_read = min(to_read, limit - current_offset)

        chunk = await client.download_file(location, offset=current_offset, size=to_read)
        if not chunk:
            break
            
        yield chunk
        current_offset += len(chunk)

@app.get("/stream")
async def stream_file(cid: int, mid: int, ah: int, request: Request):
    # Resolve metadata for headers
    peer = types.InputPeerChannel(channel_id=cid, access_hash=ah)
    messages = await client.get_messages(peer, ids=[mid])
    if not messages or not messages[0].media:
        raise HTTPException(status_code=404, detail="File not found")
    
    msg = messages[0]
    size = 0
    mime = "application/octet-stream"
    name = "file"

    if isinstance(msg.media, types.MessageMediaDocument):
        size = msg.media.document.size
        mime = msg.media.document.mime_type
        for attr in msg.media.document.attributes:
            if isinstance(attr, types.DocumentAttributeFilename):
                name = attr.file_name
    elif isinstance(msg.media, types.MessageMediaPhoto):
        size = msg.media.photo.sizes[-1].size
        mime = "image/jpeg"
        name = f"photo_{mid}.jpg"

    # Handle Range Requests (for video seeking)
    range_header = request.headers.get("Range")
    start = 0
    end = size - 1

    if range_header:
        # Example: bytes=0-1023
        parts = range_header.replace("bytes=", "").split("-")
        start = int(parts[0])
        if parts[1]:
            end = int(parts[1])
        
        status_code = 206
        headers = {
            "Content-Range": f"bytes {start}-{end}/{size}",
            "Content-Length": str(end - start + 1),
            "Accept-Ranges": "bytes",
            "Content-Type": mime,
            "Content-Disposition": f'inline; filename="{name}"'
        }
    else:
        status_code = 200
        headers = {
            "Content-Length": str(size),
            "Accept-Ranges": "bytes",
            "Content-Type": mime,
            "Content-Disposition": f'inline; filename="{name}"'
        }

    return StreamingResponse(
        file_generator(cid, mid, ah, offset=start, limit=end + 1),
        status_code=status_code,
        headers=headers
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
