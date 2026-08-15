"""
Azure Blob Storage Service — Application/Infrastructure layer
=============================================================
Unified, centralized cloud storage service for all InvIQ PDF documents:
- Vendor delivery invoices (invoices/...)
- Admin stock & low-stock reports (reports/...)
- Transaction & audit exports (exports/...)
- Requisition orders (requisitions/...)

Features:
- Connects via connection string or Account Name + Key
- Automatic container initialization
- Upload / Download / Stream / SAS URL generation
- Graceful degradation when Azure credentials are not set (is_available flag)
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from io import BytesIO

from app.core.config import settings

logger = logging.getLogger("smart_inventory.storage")


class AzureBlobStorageService:
    """Centralized Azure Blob Storage client for InvIQ documents & PDFs."""

    def __init__(self):
        self._available = False
        self._blob_service_client = None
        self._container_client = None
        self._container_name = settings.AZURE_STORAGE_CONTAINER_NAME or "inviq-documents"
        self._account_name = settings.AZURE_STORAGE_ACCOUNT_NAME
        self._account_key = settings.AZURE_STORAGE_ACCOUNT_KEY
        self._connection_string = settings.AZURE_STORAGE_CONNECTION_STRING

        self._initialize_client()

    def _initialize_client(self) -> None:
        """Initialize Azure Blob Service Client and ensure container exists."""
        try:
            from azure.storage.blob import BlobServiceClient, ContainerClient
        except ImportError:
            logger.warning("azure-storage-blob is not installed — cloud storage disabled")
            self._available = False
            return

        try:
            if self._connection_string and self._connection_string.strip():
                self._blob_service_client = BlobServiceClient.from_connection_string(
                    self._connection_string.strip()
                )
            elif self._account_name and self._account_key:
                account_url = f"https://{self._account_name.strip()}.blob.core.windows.net"
                self._blob_service_client = BlobServiceClient(
                    account_url=account_url,
                    credential=self._account_key.strip(),
                )
            else:
                logger.info(
                    "Azure Blob Storage credentials not set — running with local/database PDF storage fallback"
                )
                self._available = False
                return

            # Ensure container exists
            self._container_client = self._blob_service_client.get_container_client(
                self._container_name
            )
            try:
                self._container_client.create_container()
                logger.info("Created Azure Blob container: %s", self._container_name)
            except Exception:
                # Container already exists or permissions restrict creation
                pass

            self._available = True
            logger.info(
                "Azure Blob Storage initialized successfully (Container: %s)",
                self._container_name,
            )

        except Exception as e:
            logger.warning("Failed to initialize Azure Blob Storage: %s", str(e))
            self._available = False

    @property
    def is_available(self) -> bool:
        """Check if Azure Blob Storage is configured and operational."""
        return self._available

    def upload_file(
        self,
        file_bytes: bytes,
        blob_name: str,
        content_type: str = "application/pdf",
    ) -> Optional[str]:
        """
        Upload file bytes to Azure Blob Storage.

        Args:
            file_bytes: Raw binary content
            blob_name: Target path in container (e.g. 'invoices/2026/08/INV-20260814-001.pdf')
            content_type: MIME type (default 'application/pdf')

        Returns:
            str: Full URL of the uploaded blob, or None if unavailable/failed
        """
        if not self._available or not self._container_client:
            logger.debug("Azure Blob Storage not available — skipping cloud upload for %s", blob_name)
            return None

        try:
            from azure.storage.blob import ContentSettings

            blob_client = self._container_client.get_blob_client(blob_name)
            blob_client.upload_blob(
                file_bytes,
                overwrite=True,
                content_settings=ContentSettings(content_type=content_type),
            )
            logger.info("Successfully uploaded blob to Azure: %s (%d bytes)", blob_name, len(file_bytes))
            return blob_client.url

        except Exception as e:
            logger.error("Azure Blob upload failed for %s: %s", blob_name, str(e))
            return None

    def download_file(self, blob_name: str) -> Optional[bytes]:
        """
        Download blob bytes from Azure.

        Args:
            blob_name: Target blob path in container

        Returns:
            bytes: Downloaded content or None
        """
        if not self._available or not self._container_client:
            return None

        try:
            blob_client = self._container_client.get_blob_client(blob_name)
            stream = blob_client.download_blob()
            return stream.readall()
        except Exception as e:
            logger.error("Azure Blob download failed for %s: %s", blob_name, str(e))
            return None

    def generate_sas_url(self, blob_name: str, expiry_hours: int = 24) -> Optional[str]:
        """
        Generate a secure, time-limited presigned SAS URL for direct browser access.

        Args:
            blob_name: Target blob path
            expiry_hours: Lifetime of URL in hours (default 24)

        Returns:
            str: Presigned URL or standard blob URL
        """
        if not self._available or not self._container_client:
            return None

        try:
            from azure.storage.blob import generate_blob_sas, BlobSasPermissions

            blob_client = self._container_client.get_blob_client(blob_name)

            if self._account_name and self._account_key:
                sas_token = generate_blob_sas(
                    account_name=self._account_name,
                    container_name=self._container_name,
                    blob_name=blob_name,
                    account_key=self._account_key,
                    permission=BlobSasPermissions(read=True),
                    expiry=datetime.now(timezone.utc) + timedelta(hours=expiry_hours),
                )
                return f"{blob_client.url}?{sas_token}"
            
            return blob_client.url

        except Exception as e:
            logger.warning("Could not generate SAS URL for %s: %s", blob_name, str(e))
            return None

    def delete_file(self, blob_name: str) -> bool:
        """Delete a blob from Azure."""
        if not self._available or not self._container_client:
            return False

        try:
            blob_client = self._container_client.get_blob_client(blob_name)
            blob_client.delete_blob()
            logger.info("Deleted blob from Azure: %s", blob_name)
            return True
        except Exception as e:
            logger.warning("Failed to delete blob %s: %s", blob_name, str(e))
            return False


# Singleton instance
_storage_service: Optional[AzureBlobStorageService] = None


def get_storage_service() -> AzureBlobStorageService:
    """Get or create singleton AzureBlobStorageService."""
    global _storage_service
    if _storage_service is None:
        _storage_service = AzureBlobStorageService()
    return _storage_service
