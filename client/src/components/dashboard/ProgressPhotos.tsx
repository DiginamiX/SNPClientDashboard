import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";

interface Photo {
  id: number;
  date: string;
  imageUrl: string;
  category?: string;
}

interface ProgressPhotosProps {
  photos: Photo[];
  onUploadClick: () => void;
}

export default function ProgressPhotos({ photos, onUploadClick }: ProgressPhotosProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Recent Progress Photos</h3>
          <a href="/progress-photos" className="text-primary text-sm font-medium hover:text-blue-700 dark:hover:text-blue-400">
            View all
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <Dialog key={photo.id}>
              <DialogTrigger asChild>
                <div className="relative group cursor-pointer" onClick={() => setSelectedPhoto(photo)}>
                  <img
                    src={photo.imageUrl}
                    alt={`Progress photo from ${format(new Date(photo.date), 'MMM d, yyyy')}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {format(new Date(photo.date), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <div className="p-2">
                  <img
                    src={photo.imageUrl}
                    alt={`Progress photo from ${format(new Date(photo.date), 'MMM d, yyyy')}`}
                    className="w-full max-h-[70vh] object-contain rounded-lg"
                  />
                  <div className="mt-4 text-center">
                    <h3 className="font-medium">
                      {format(new Date(photo.date), 'MMMM d, yyyy')}
                    </h3>
                    {photo.category && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {photo.category}
                      </p>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ))}

          <div 
            className="flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg h-24 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            onClick={onUploadClick}
          >
            <div className="text-center">
              <i className="ri-add-line text-2xl text-slate-500 dark:text-slate-400"></i>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Upload New</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
