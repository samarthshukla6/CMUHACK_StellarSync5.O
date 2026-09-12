(function(root){
  function validatePhotoFiles(selected){
    const files=Array.from(selected);
    if(files.length>5)throw new Error('Choose at most 5 photos at a time.');
    return files.map(file=>{
      if(file.size>25*1024*1024)throw new Error(`${file.name} is larger than 25 MB. Choose a smaller image.`);
      const extension=file.name.split('.').pop().toLowerCase();
      const type=file.type||({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[extension]);
      if(!['image/jpeg','image/png','image/webp'].includes(type))throw new Error(`${file.name} is not a supported photo. Export it as JPEG, PNG or WebP, then select it again.`);
      return file.type?file:new File([file],file.name,{type,lastModified:file.lastModified});
    });
  }
  root.validatePhotoFiles=validatePhotoFiles;
})(globalThis);
