import cloudinary.uploader


def upload_file_to_cloudinary(file_obj, folder, public_id=None, resource_type="image"):
    upload_options = {
        "folder": folder,
        "resource_type": resource_type,
        "overwrite": True,
    }

    if public_id:
        upload_options["public_id"] = public_id

    result = cloudinary.uploader.upload(file_obj, **upload_options)
    return result["secure_url"]