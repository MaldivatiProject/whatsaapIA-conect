import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { SendMessageForm } from "@/features/messages/components/SendMessageForm";
import { SendMediaForm } from "@/features/messages/components/SendMediaForm";
import { ActivityFeed } from "@/features/activity/components/ActivityFeed";
import { MESSAGE_EVENT_NAMES } from "@/features/activity/lib/formatEvent";

export default function MessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Mensajes</h1>
        <p className="text-sm text-muted-foreground">
          Enviar mensajes de prueba y ver el feed en vivo de mensajes entrantes/salientes.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Enviar</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="text">
              <TabsList>
                <TabsTrigger value="text">Texto</TabsTrigger>
                <TabsTrigger value="media">Multimedia</TabsTrigger>
              </TabsList>
              <TabsContent value="text" className="pt-4">
                <SendMessageForm />
              </TabsContent>
              <TabsContent value="media" className="pt-4">
                <SendMediaForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feed en vivo</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed
              filterEventNames={MESSAGE_EVENT_NAMES}
              emptyMessage="Sin mensajes todavía."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
