import { supabase } from '../_lib/supabase';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'DELETE') {
    return Response.json(
      { error: `Method ${req.method} not allowed` },
      { status: 405 }
    );
  }

  try {
    const url = new URL(req.url);
    const fileId = url.pathname.split('/').pop();

    if (!fileId) {
      return Response.json(
        { error: 'Missing file ID' },
        { status: 400 }
      );
    }

    // Check if file has a storage object to clean up
    const { data: file } = await supabase
      .from('files')
      .select('storage_path')
      .eq('id', fileId)
      .single();

    if (file?.storage_path) {
      await supabase.storage
        .from('thesis-files')
        .remove([file.storage_path]);
    }

    // Delete from files table (cascade deletes chunks automatically)
    await supabase
      .from('files')
      .delete()
      .eq('id', fileId);

    return Response.json({ success: true });
  } catch (err) {
    console.error('Error deleting file:', err);
    return Response.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
