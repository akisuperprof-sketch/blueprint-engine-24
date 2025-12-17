import os
import json
import shutil
from datetime import datetime
import streamlit as st
from PIL import Image

HISTORY_DIR = "history_data"

def init_history():
    if not os.path.exists(HISTORY_DIR):
        os.makedirs(HISTORY_DIR)

def save_session(session_state, final_image=None):
    """
    Saves the current session state and valid images to a history folder.
    """
    init_history()
    
    # Create a unique ID for this save
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    session_id = f"session_{timestamp}"
    session_dir = os.path.join(HISTORY_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)

    # 1. Save Meta Data (Text Inputs, Settings)
    meta_data = {
        "timestamp": timestamp,
        "input_text": session_state.get("draft_data", {}).get("main_title", "Untitled") or "Untitled",
        "phase": session_state.get("phase", "input"),
        "archetype": session_state.get("draft_data", {}).get("archetype_name", ""),
        "selected_style": session_state.get("selected_style_key", ""),
        "draft_data": session_state.get("draft_data", {}),
        "final_prompt": session_state.get("final_prompt", ""),
        "is_ref_mandatory": session_state.get("is_ref_mandatory", False),
        "additional_inst": session_state.get("additional_inst", "")
    }
    
    with open(os.path.join(session_dir, "metadata.json"), "w", encoding="utf-8") as f:
        json.dump(meta_data, f, ensure_ascii=False, indent=2)

    # 2. Save Reference Images
    if "ref_images" in session_state and session_state.ref_images:
        ref_dir = os.path.join(session_dir, "ref_images")
        os.makedirs(ref_dir, exist_ok=True)
        for i, img in enumerate(session_state.ref_images):
            try:
                img.save(os.path.join(ref_dir, f"ref_{i}.png"))
            except Exception as e:
                print(f"Failed to save ref image {i}: {e}")

    # 3. Save Final Image (if exists)
    if final_image:
        try:
            final_image.save(os.path.join(session_dir, "final_output.png"))
        except Exception as e:
            print(f"Failed to save final image: {e}")
            
    return session_id

def load_session(session_id):
    """
    Loads a session from history into st.session_state.
    """
    session_dir = os.path.join(HISTORY_DIR, session_id)
    if not os.path.exists(session_dir):
        return False
        
    try:
        # 1. Load Metadata
        with open(os.path.join(session_dir, "metadata.json"), "r", encoding="utf-8") as f:
            meta = json.load(f)
            
        st.session_state.phase = "design" # Jump to design/result view usually
        st.session_state.draft_data = meta.get("draft_data", {})
        st.session_state.final_prompt = meta.get("final_prompt", "")
        st.session_state.selected_style_key = meta.get("selected_style", "ビジネス・プロ (Business Pro)")
        st.session_state.is_ref_mandatory = meta.get("is_ref_mandatory", False)
        st.session_state.additional_inst = meta.get("additional_inst", "")

        # 2. Load Reference Images
        ref_dir = os.path.join(session_dir, "ref_images")
        st.session_state.ref_images = []
        if os.path.exists(ref_dir):
            files = sorted(os.listdir(ref_dir))
            for file in files:
                if file.startswith("ref_") and (file.endswith(".png") or file.endswith(".jpg")):
                    try:
                        img = Image.open(os.path.join(ref_dir, file))
                        st.session_state.ref_images.append(img)
                    except: pass

        # 3. Load Final Image
        final_img_path = os.path.join(session_dir, "final_output.png")
        if os.path.exists(final_img_path):
            st.session_state.final_image = Image.open(final_img_path)
            
        return True
    except Exception as e:
        st.error(f"Failed to load session: {e}")
        return False

def get_history_list():
    """
    Returns list of saved sessions sorted by new.
    """
    init_history()
    sessions = []
    for item in os.listdir(HISTORY_DIR):
        full_path = os.path.join(HISTORY_DIR, item)
        if os.path.isdir(full_path):
            meta_path = os.path.join(full_path, "metadata.json")
            if os.path.exists(meta_path):
                try:
                    with open(meta_path, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                        sessions.append({
                            "id": item,
                            "timestamp": meta.get("timestamp", ""),
                            "title": meta.get("input_text", "No Title"),
                            "style": meta.get("selected_style", "")
                        })
                except: pass
    
    # Sort by timestamp desc
    sessions.sort(key=lambda x: x["timestamp"], reverse=True)
    return sessions
